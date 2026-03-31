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

  const { paymentIntentId } = await req.json();

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  await stripe.paymentIntents.capture(paymentIntentId);

  return NextResponse.json({ ok: true });
}
