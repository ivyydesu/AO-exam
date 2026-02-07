import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";

export async function POST(req: NextRequest) {
  const { title, amount, requestId } = await req.json();

  if (!title || !amount || !requestId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: { name: title },
          unit_amount: amount
        },
        quantity: 1
      }
    ],
    payment_intent_data: {
      capture_method: "manual"
    },
    metadata: {
      request_id: requestId
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/demo/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/demo/checkout-cancel?request_id=${requestId}`
  });

  return NextResponse.json({ url: session.url });
}
