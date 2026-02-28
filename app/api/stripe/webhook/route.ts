import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

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
        const { count } = await supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestForChat.id);

        if (!count || count === 0) {
          const starterSender = requestForChat.tutor_id ?? requestForChat.requester_id;
          await supabaseAdmin.from("messages").insert({
            request_id: requestForChat.id,
            sender_id: starterSender,
            content: "【AO Match】支払いが完了しました。ここからチャットで相談を開始できます。"
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
