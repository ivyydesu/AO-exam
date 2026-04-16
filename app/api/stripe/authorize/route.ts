import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { getAppModeFromRequest } from "../../../../lib/appMode";
import { DEFAULT_PLATFORM_FEE_PERCENT } from "../../../../lib/platformFee";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { isStrictAdmin } from "../../../../lib/auth/adminAllowlist";

type AuthorizeBody = {
  requestId: string;
};

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`stripe:authorize:${user.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `操作回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const appMode = getAppModeFromRequest(req);
    const allowTestBypass = process.env.NODE_ENV !== "production" && appMode === "test";
    const body = (await req.json()) as AuthorizeBody;
    const requestId = body.requestId;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Unauthorized role for payment auth" }, { status: 403 });
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("requests")
      .select("id, title, budget, status, tutor_id, requester_id")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (!requestRow.tutor_id) {
      return NextResponse.json({ error: "Tutor is not assigned" }, { status: 400 });
    }
    if (!strictAdmin && requestRow.requester_id !== user.id) {
      return NextResponse.json({ error: "この依頼の決済操作権限がありません" }, { status: 403 });
    }

    if (!["accepted", "draft", "escrow_pending"].includes(requestRow.status)) {
      return NextResponse.json(
        { error: "Request status is not valid for authorization" },
        { status: 400 }
      );
    }

    const { data: tutorProfile, error: tutorError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", requestRow.tutor_id)
      .single();

    if ((tutorError || !tutorProfile?.stripe_account_id) && !allowTestBypass) {
      return NextResponse.json(
        { error: "Seller Stripe connected account is missing" },
        { status: 400 }
      );
    }

    const { data: verification } = await supabaseAdmin
      .from("tutor_verifications")
      .select("status")
      .eq("user_id", requestRow.tutor_id)
      .maybeSingle();

    if (verification?.status !== "approved" && !allowTestBypass) {
      return NextResponse.json(
        { error: "Tutor verification is not approved yet" },
        { status: 403 }
      );
    }

    const amount = Number(requestRow.budget);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid request budget" }, { status: 400 });
    }

    const applicationFeeAmount = Math.floor((amount * DEFAULT_PLATFORM_FEE_PERCENT) / 100);

    const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount,
      currency: "jpy",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata: {
        request_id: requestRow.id
      }
    };

    if (tutorProfile?.stripe_account_id) {
      paymentIntentParams.transfer_data = {
        destination: tutorProfile.stripe_account_id
      };
      paymentIntentParams.application_fee_amount = applicationFeeAmount;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    await supabaseAdmin
      .from("requests")
      .update({
        status: "escrow_pending",
        stripe_payment_intent_id: paymentIntent.id
      })
      .eq("id", requestRow.id);

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      captureMethod: paymentIntent.capture_method
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to authorize payment";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
