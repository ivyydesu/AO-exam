import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { getAppModeFromRequest } from "../../../../lib/appMode";
import { getPlatformFeePercent } from "../../../../lib/platformFee";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { isStrictAdmin } from "../../../../lib/auth/adminAllowlist";

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`stripe:checkout:${user.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `操作回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const { requestId } = await req.json();
    const appMode = getAppModeFromRequest(req);
    const allowTestBypass = process.env.NODE_ENV !== "production" && appMode === "test";

    const supabaseAdmin = getSupabaseAdmin();
    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();
    if (meError || !me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const strictAdmin = isStrictAdmin(me.role, user.email);
    if (me.role !== "student" && !strictAdmin) {
      return NextResponse.json({ error: "Unauthorized role for checkout" }, { status: 403 });
    }

    const { data: request, error } = await supabaseAdmin
      .from("requests")
      .select("id, title, budget, requester_id, status, tutor_id")
      .eq("id", requestId)
      .single();

    if (error || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (!strictAdmin && request.requester_id !== user.id) {
      return NextResponse.json({ error: "この依頼の決済操作権限がありません" }, { status: 403 });
    }

    if (request.status !== "accepted") {
      return NextResponse.json({ error: "Tutor must accept before escrow" }, { status: 400 });
    }

    if (!request.tutor_id) {
      return NextResponse.json({ error: "Tutor not set" }, { status: 400 });
    }

    const { data: tutorProfile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", request.tutor_id)
      .single();

    const tutorStripeAccountId = tutorProfile?.stripe_account_id ?? null;
    if (!tutorStripeAccountId && !allowTestBypass) {
      return NextResponse.json({ error: "Tutor missing Stripe account" }, { status: 400 });
    }

    const { data: verification } = await supabaseAdmin
      .from("tutor_verifications")
      .select("status")
      .eq("user_id", request.tutor_id)
      .maybeSingle();

    if (verification?.status !== "approved" && !allowTestBypass) {
      return NextResponse.json({ error: "Tutor verification is not approved yet" }, { status: 403 });
    }

    const amount = Number(request.budget);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid request budget" }, { status: 400 });
    }

    const feePercent = await getPlatformFeePercent(supabaseAdmin);
    const feeAmount = Math.floor((amount * feePercent) / 100);

    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
      capture_method: "manual",
      metadata: {
        request_id: request.id,
        platform_fee_percent: String(feePercent),
        platform_fee_amount_jpy: String(feeAmount),
        tutor_stripe_account_id: tutorStripeAccountId ?? "",
        platform_fee_applied: tutorStripeAccountId ? "true" : "false"
      }
    };

    if (tutorStripeAccountId) {
      paymentIntentData.application_fee_amount = feeAmount;
      paymentIntentData.transfer_data = { destination: tutorStripeAccountId };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "jpy",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: { name: request.title },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      payment_intent_data: paymentIntentData,
      metadata: {
        request_id: request.id,
        platform_fee_percent: String(feePercent),
        platform_fee_amount_jpy: String(feeAmount),
        tutor_stripe_account_id: tutorStripeAccountId ?? "",
        platform_fee_applied: tutorStripeAccountId ? "true" : "false"
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?requestId=${request.id}&paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/requests/${request.id}?canceled=1`
    });

    await supabaseAdmin
      .from("requests")
      .update({
        status: "escrow_pending",
        stripe_checkout_session_id: session.id
      })
      .eq("id", request.id);

    return NextResponse.json({
      url: session.url,
      warning:
        !tutorStripeAccountId
          ? "test_mode_without_connect_account"
          : verification?.status !== "approved" && allowTestBypass
            ? "test_mode_without_tutor_verification"
            : null
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
