import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { requestId, paymentIntentId } = await req.json();

    const supabaseAdmin = getSupabaseAdmin();

    let resolvedRequestId: string | null = requestId ?? null;
    let resolvedPaymentIntentId: string | null = paymentIntentId ?? null;

    if (!resolvedPaymentIntentId && resolvedRequestId) {
      const { data: requestRow, error } = await supabaseAdmin
        .from("requests")
        .select("id, status, requester_id, tutor_id, stripe_payment_intent_id, stripe_checkout_session_id")
        .eq("id", resolvedRequestId)
        .single();

      if (error || !requestRow) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      resolvedPaymentIntentId = requestRow.stripe_payment_intent_id;
      if (!resolvedPaymentIntentId && requestRow.stripe_checkout_session_id) {
        const session = await stripe.checkout.sessions.retrieve(requestRow.stripe_checkout_session_id);
        resolvedPaymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;
      }
    }

    if (!resolvedPaymentIntentId) {
      return NextResponse.json(
        { error: "Missing paymentIntentId or requestId with linked payment intent" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(resolvedPaymentIntentId);
    if (!["requires_capture", "succeeded"].includes(paymentIntent.status)) {
      return NextResponse.json(
        { error: `PaymentIntent is not capturable. Current status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    const captured =
      paymentIntent.status === "succeeded"
        ? paymentIntent
        : await stripe.paymentIntents.capture(resolvedPaymentIntentId);

    if (!resolvedRequestId) {
      resolvedRequestId =
        typeof captured.metadata?.request_id === "string"
          ? captured.metadata.request_id
          : null;
    }

    if (resolvedRequestId) {
      const { data: requestForChat } = await supabaseAdmin
        .from("requests")
        .select("id, title, requester_id, tutor_id")
        .eq("id", resolvedRequestId)
        .maybeSingle();

      await supabaseAdmin
        .from("requests")
        .update({ status: "completed", stripe_payment_intent_id: captured.id })
        .eq("id", resolvedRequestId);

      if (requestForChat?.requester_id && requestForChat?.tutor_id) {
        const { count } = await supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestForChat.id);

        if (!count || count === 0) {
          const starterSender = requestForChat.tutor_id ?? requestForChat.requester_id;
          await supabaseAdmin.from("messages").insert({
            request_id: requestForChat.id,
            sender_id: starterSender,
            content: `【AO Match】支払いが完了しました。ここからチャットで相談を開始できます。`
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      paymentIntentId: captured.id,
      status: captured.status
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to capture payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
