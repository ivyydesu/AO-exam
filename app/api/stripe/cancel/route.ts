import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { requestId, paymentIntentId } = await req.json();

    const supabaseAdmin = getSupabaseAdmin();

    let resolvedRequestId: string | null = requestId ?? null;
    let resolvedPaymentIntentId: string | null = paymentIntentId ?? null;
    let requestStatus: string | null = null;
    let checkoutSessionId: string | null = null;

    if (!resolvedPaymentIntentId && resolvedRequestId) {
      const { data: requestRow, error } = await supabaseAdmin
        .from("requests")
        .select("id, status, stripe_payment_intent_id, stripe_checkout_session_id")
        .eq("id", resolvedRequestId)
        .single();

      if (error || !requestRow) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
