import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";

export async function POST(req: NextRequest) {
  const { paymentIntentId } = await req.json();

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  await stripe.paymentIntents.capture(paymentIntentId);

  return NextResponse.json({ ok: true });
}
