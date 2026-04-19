import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { ensurePaidChatGroup } from "../../../../lib/chatGroups";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { isStrictAdmin } from "../../../../lib/auth/adminAllowlist";

function compactMetadata(values: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => typeof value === "string" && value.length > 0)
  ) as Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`stripe:capture:${user.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `操作回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const { requestId, paymentIntentId } = await req.json();

    const supabaseAdmin = getSupabaseAdmin();
    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();
    if (meError || !me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const strictAdmin = isStrictAdmin(me.role, user.email);

    let resolvedRequestId: string | null = requestId ?? null;
    let resolvedPaymentIntentId: string | null = paymentIntentId ?? null;
    let requestOwnerId: string | null = null;

    if (!resolvedPaymentIntentId && resolvedRequestId) {
      const { data: requestRow, error } = await supabaseAdmin
        .from("requests")
        .select("id, status, requester_id, tutor_id, stripe_payment_intent_id, stripe_checkout_session_id")
        .eq("id", resolvedRequestId)
        .single();

      if (error || !requestRow) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      requestOwnerId = requestRow.requester_id;
      if (!strictAdmin && requestRow.requester_id !== user.id) {
        return NextResponse.json({ error: "この依頼の決済操作権限がありません" }, { status: 403 });
      }

      resolvedPaymentIntentId = requestRow.stripe_payment_intent_id;
      if (!resolvedPaymentIntentId && requestRow.stripe_checkout_session_id) {
        const session = await stripe.checkout.sessions.retrieve(requestRow.stripe_checkout_session_id);
        resolvedPaymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;
      }
    }

    if (!resolvedPaymentIntentId) {
      return NextResponse.json(
        { error: "Missing paymentIntentId or requestId with linked payment intent" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(resolvedPaymentIntentId);
    if (!["requires_capture", "succeeded"].includes(paymentIntent.status)) {
      return NextResponse.json(
        { error: `PaymentIntent is not capturable. Current status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    const captured =
      paymentIntent.status === "succeeded"
        ? paymentIntent
        : await stripe.paymentIntents.capture(resolvedPaymentIntentId);

    try {
      const chargeId =
        typeof captured.latest_charge === "string"
          ? captured.latest_charge
          : captured.latest_charge?.id ?? null;
      if (chargeId) {
        const chargeMetadata = compactMetadata({
          request_id: typeof captured.metadata?.request_id === "string" ? captured.metadata.request_id : resolvedRequestId,
          platform_fee_percent: captured.metadata?.platform_fee_percent,
          platform_fee_amount_jpy: captured.metadata?.platform_fee_amount_jpy,
          tutor_stripe_account_id: captured.metadata?.tutor_stripe_account_id,
          platform_fee_applied: captured.metadata?.platform_fee_applied
        });
        await stripe.charges.update(chargeId, {
          metadata: chargeMetadata,
          description:
            captured.metadata?.platform_fee_percent && captured.metadata?.platform_fee_amount_jpy
              ? `platform_fee ${captured.metadata.platform_fee_percent}% (${captured.metadata.platform_fee_amount_jpy} JPY)`
              : undefined
        });
      }
    } catch {
      // Ignore metadata sync failure and continue payment flow.
    }

    if (!resolvedRequestId) {
      resolvedRequestId =
        typeof captured.metadata?.request_id === "string"
          ? captured.metadata.request_id
          : null;
    }
    if (!resolvedRequestId) {
      return NextResponse.json({ error: "requestId metadata is missing on PaymentIntent" }, { status: 400 });
    }

    if (resolvedRequestId) {
      const { data: requestForChat } = await supabaseAdmin
        .from("requests")
        .select("id, title, requester_id, tutor_id")
        .eq("id", resolvedRequestId)
        .maybeSingle();
      if (!requestForChat) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      requestOwnerId = requestForChat.requester_id;
      if (!strictAdmin && requestForChat.requester_id !== user.id) {
        return NextResponse.json({ error: "この依頼の決済操作権限がありません" }, { status: 403 });
      }

      await supabaseAdmin
        .from("requests")
        .update({ status: "completed", stripe_payment_intent_id: captured.id })
        .eq("id", resolvedRequestId);

      if (requestForChat?.requester_id && requestForChat?.tutor_id) {
        await ensurePaidChatGroup(
          supabaseAdmin,
          requestForChat.id,
          requestForChat.requester_id,
          requestForChat.tutor_id
        );
        const { count } = await supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestForChat.id);

        if (!count || count === 0) {
          const starterSender = requestForChat.tutor_id ?? requestForChat.requester_id;
          const insertResult = await supabaseAdmin.from("messages").insert({
            request_id: requestForChat.id,
            sender_id: starterSender,
            content: `【ユニブリ】支払いが完了しました。専用チャットグループを作成しました。ここから相談を開始できます。`,
            message_kind: "system"
          });
          if (insertResult.error && insertResult.error.message.includes("column")) {
            await supabaseAdmin.from("messages").insert({
              request_id: requestForChat.id,
              sender_id: starterSender,
              content: `【ユニブリ】支払いが完了しました。専用チャットグループを作成しました。ここから相談を開始できます。`
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      paymentIntentId: captured.id,
      status: captured.status,
      requesterId: requestOwnerId
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to capture payment";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
