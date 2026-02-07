import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const { requestId } = await req.json();

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, status, stripe_payment_intent_id")
    .eq("id", requestId)
    .single();

  if (!request?.stripe_payment_intent_id) {
    return NextResponse.json({ error: "Missing payment intent" }, { status: 400 });
  }

  if (request.status !== "escrowed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await stripe.paymentIntents.capture(request.stripe_payment_intent_id);

  await supabaseAdmin
    .from("requests")
    .update({ status: "completed" })
    .eq("id", requestId);

  return NextResponse.json({ ok: true });
}
