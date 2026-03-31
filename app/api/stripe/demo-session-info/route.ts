import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireStrictAdminFromBearer(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
