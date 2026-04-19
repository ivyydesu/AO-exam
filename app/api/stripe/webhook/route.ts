import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { ensurePaidChatGroup } from "../../../../lib/chatGroups";

function compactMetadata(values: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => typeof value === "string" && value.length > 0)
  ) as Record<string, string>;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.request_id;
    const paymentIntentId = session.payment_intent as string | null;

    if (requestId && paymentIntentId) {
      const supabaseAdmin = getSupabaseAdmin();
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId =
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id ?? null;
        if (chargeId) {
          const chargeMetadata = compactMetadata({
            request_id: requestId,
            platform_fee_percent: paymentIntent.metadata?.platform_fee_percent,
            platform_fee_amount_jpy: paymentIntent.metadata?.platform_fee_amount_jpy,
            tutor_stripe_account_id: paymentIntent.metadata?.tutor_stripe_account_id,
            platform_fee_applied: paymentIntent.metadata?.platform_fee_applied
          });
          await stripe.charges.update(chargeId, {
            metadata: chargeMetadata,
            description:
              paymentIntent.metadata?.platform_fee_percent && paymentIntent.metadata?.platform_fee_amount_jpy
                ? `platform_fee ${paymentIntent.metadata.platform_fee_percent}% (${paymentIntent.metadata.platform_fee_amount_jpy} JPY)`
                : undefined
          });
        }
      } catch {
        // Ignore metadata sync failure and keep webhook flow resilient.
      }

      const { data: requestForChat } = await supabaseAdmin
        .from("requests")
        .select("id, title, requester_id, tutor_id")
        .eq("id", requestId)
        .maybeSingle();

      await supabaseAdmin
        .from("requests")
        .update({ status: "escrowed", stripe_payment_intent_id: paymentIntentId })
        .eq("id", requestId);

      if (requestForChat?.requester_id && requestForChat?.tutor_id) {
        await ensurePaidChatGroup(
          supabaseAdmin,
          requestForChat.id,
          requestForChat.requester_id,
          requestForChat.tutor_id
        );
        const { count } = await supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestForChat.id);

        if (!count || count === 0) {
          const starterSender = requestForChat.tutor_id ?? requestForChat.requester_id;
          const insertResult = await supabaseAdmin.from("messages").insert({
            request_id: requestForChat.id,
            sender_id: starterSender,
            content: "【ユニブリ】支払いが完了しました。専用チャットグループを作成しました。ここからチャットで相談を開始できます。",
            message_kind: "system"
          });
          if (insertResult.error && insertResult.error.message.includes("column")) {
            await supabaseAdmin.from("messages").insert({
              request_id: requestForChat.id,
              sender_id: starterSender,
              content: "【ユニブリ】支払いが完了しました。専用チャットグループを作成しました。ここからチャットで相談を開始できます。"
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
