import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const { requestId } = await req.json();

  const supabaseAdmin = getSupabaseAdmin();
  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, status, stripe_payment_intent_id")
    .eq("id", requestId)
    .single();

  if (!request?.stripe_payment_intent_id) {
    return NextResponse.json({ error: "Missing payment intent" }, { status: 400 });
  }

  if (!["escrowed", "escrow_pending"].includes(request.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await stripe.paymentIntents.cancel(request.stripe_payment_intent_id);

  await supabaseAdmin
    .from("requests")
    .update({ status: "canceled" })
    .eq("id", requestId);

  return NextResponse.json({ ok: true });
}
