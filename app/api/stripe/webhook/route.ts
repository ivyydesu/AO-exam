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
      await supabaseAdmin
        .from("requests")
        .update({ status: "escrowed", stripe_payment_intent_id: paymentIntentId })
        .eq("id", requestId);
    }
  }

  return NextResponse.json({ received: true });
}
