import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return NextResponse.json({
    paymentIntentId: session.payment_intent,
    requestId: session.metadata?.request_id ?? null
  });
}
