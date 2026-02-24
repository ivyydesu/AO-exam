import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

type AuthorizeBody = {
  requestId: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuthorizeBody;
    const requestId = body.requestId;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("requests")
      .select("id, title, budget, status, tutor_id")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (!requestRow.tutor_id) {
      return NextResponse.json({ error: "Tutor is not assigned" }, { status: 400 });
    }

    if (!["accepted", "draft", "escrow_pending"].includes(requestRow.status)) {
      return NextResponse.json(
        { error: "Request status is not valid for authorization" },
        { status: 400 }
      );
    }

    const { data: tutorProfile, error: tutorError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", requestRow.tutor_id)
      .single();

    if (tutorError || !tutorProfile?.stripe_account_id) {
      return NextResponse.json(
        { error: "Seller Stripe connected account is missing" },
        { status: 400 }
      );
    }

    const { data: verification } = await supabaseAdmin
      .from("tutor_verifications")
      .select("status")
      .eq("user_id", requestRow.tutor_id)
      .maybeSingle();

    if (verification?.status !== "approved") {
      return NextResponse.json(
        { error: "Tutor verification is not approved yet" },
        { status: 403 }
      );
    }

    const amount = Number(requestRow.budget);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid request budget" }, { status: 400 });
    }

    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 15);
    const applicationFeeAmount = Math.floor((amount * feePercent) / 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: tutorProfile.stripe_account_id
      },
      application_fee_amount: applicationFeeAmount,
      metadata: {
        request_id: requestRow.id
      }
    });

    await supabaseAdmin
      .from("requests")
      .update({
        status: "escrow_pending",
        stripe_payment_intent_id: paymentIntent.id
      })
      .eq("id", requestRow.id);

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      captureMethod: paymentIntent.capture_method
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to authorize payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
