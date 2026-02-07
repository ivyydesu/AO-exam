import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const { requestId } = await req.json();

  const supabaseAdmin = getSupabaseAdmin();
  const { data: request, error } = await supabaseAdmin
    .from("requests")
    .select("id, title, budget, requester_id, status, tutor_id")
    .eq("id", requestId)
    .single();

  if (error || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.status !== "accepted") {
    return NextResponse.json({ error: "Tutor must accept before escrow" }, { status: 400 });
  }

  if (!request.tutor_id) {
    return NextResponse.json({ error: "Tutor not set" }, { status: 400 });
  }

  const { data: tutorProfile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", request.tutor_id)
    .single();

  if (!tutorProfile?.stripe_account_id) {
    return NextResponse.json({ error: "Tutor missing Stripe account" }, { status: 400 });
  }

  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 15);
  const feeAmount = Math.floor((request.budget * feePercent) / 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: { name: request.title },
          unit_amount: request.budget
        },
        quantity: 1
      }
    ],
    payment_intent_data: {
      capture_method: "manual",
      application_fee_amount: feeAmount,
      transfer_data: {
        destination: tutorProfile.stripe_account_id
      }
    },
    metadata: {
      request_id: request.id
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/requests/${request.id}?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/requests/${request.id}?canceled=1`
  });

  await supabaseAdmin
    .from("requests")
    .update({
      status: "escrow_pending",
      stripe_checkout_session_id: session.id
    })
    .eq("id", request.id);

  return NextResponse.json({ url: session.url });
}
