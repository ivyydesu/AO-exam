import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { isStrictAdmin } from "../../../../lib/auth/adminAllowlist";

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`stripe:cancel:${user.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `操作回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const { requestId, paymentIntentId } = await req.json();

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

    let resolvedRequestId: string | null = requestId ?? null;
    let resolvedPaymentIntentId: string | null = paymentIntentId ?? null;
    let requestStatus: string | null = null;
    let checkoutSessionId: string | null = null;

    if (!resolvedPaymentIntentId && resolvedRequestId) {
      const { data: requestRow, error } = await supabaseAdmin
        .from("requests")
        .select("id, status, requester_id, stripe_payment_intent_id, stripe_checkout_session_id")
        .eq("id", resolvedRequestId)
        .single();

      if (error || !requestRow) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      if (!strictAdmin && requestRow.requester_id && requestRow.requester_id !== user.id) {
        return NextResponse.json({ error: "この依頼の決済操作権限がありません" }, { status: 403 });
      }

      requestStatus = requestRow.status;
      checkoutSessionId = requestRow.stripe_checkout_session_id;
      resolvedPaymentIntentId = requestRow.stripe_payment_intent_id;
      if (!resolvedPaymentIntentId && requestRow.stripe_checkout_session_id) {
        const session = await stripe.checkout.sessions.retrieve(requestRow.stripe_checkout_session_id);
        resolvedPaymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;
      }
    }

    if (!resolvedPaymentIntentId) {
      if (resolvedRequestId) {
        if (checkoutSessionId && requestStatus === "escrow_pending") {
          try {
            await stripe.checkout.sessions.expire(checkoutSessionId);
          } catch {
            // セッション状態によってはexpire不可。依頼キャンセルは継続する。
          }
        }
        await supabaseAdmin.from("requests").update({ status: "canceled" }).eq("id", resolvedRequestId);
        return NextResponse.json({
          ok: true,
          requestId: resolvedRequestId,
          status: "canceled",
          note: "no_payment_intent_cancelled_request_only"
        });
      }
      return NextResponse.json({ error: "Missing paymentIntentId and requestId" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(resolvedPaymentIntentId);
    if (!["requires_capture", "requires_confirmation", "requires_payment_method"].includes(paymentIntent.status)) {
      return NextResponse.json(
        { error: `PaymentIntent cannot be canceled. Current status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    const canceled = await stripe.paymentIntents.cancel(resolvedPaymentIntentId, {
      cancellation_reason: "requested_by_customer"
    });

    if (!resolvedRequestId) {
      resolvedRequestId =
        typeof canceled.metadata?.request_id === "string"
          ? canceled.metadata.request_id
          : null;
    }

    if (resolvedRequestId) {
      const { data: rowForOwner } = await supabaseAdmin
        .from("requests")
        .select("requester_id")
        .eq("id", resolvedRequestId)
        .maybeSingle();
      if (!rowForOwner) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      if (!strictAdmin && rowForOwner.requester_id !== user.id) {
        return NextResponse.json({ error: "この依頼の決済操作権限がありません" }, { status: 403 });
      }
      await supabaseAdmin
        .from("requests")
        .update({ status: "canceled" })
        .eq("id", resolvedRequestId);
    }

    return NextResponse.json({
      ok: true,
      paymentIntentId: canceled.id,
      status: canceled.status
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel payment";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
