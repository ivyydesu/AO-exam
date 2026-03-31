import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { sanitizePlainText } from "../../../../lib/security/input";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { writeSecurityAudit } from "../../../../lib/security/audit";

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`messages:start:${user.id}`, 12, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `送信回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const { tutorId, message } = await req.json();
    const safeTutorId = String(tutorId ?? "").trim();
    const initialMessage = sanitizePlainText(
      String(message ?? "はじめまして。事前に相談内容を共有したいです。"),
      2000
    );

    if (!safeTutorId) {
      return NextResponse.json({ error: "tutorId is required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const [{ data: me }, { data: tutor }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("profiles").select("id, role, full_name").eq("id", safeTutorId).maybeSingle()
    ]);

    if (!me || me.role !== "student") {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "prepay_message_blocked",
        resource_type: "request",
        result: "failure",
        detail: "non-student user",
        ip: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent")
      });
      return NextResponse.json({ error: "高校生アカウントのみ利用できます" }, { status: 403 });
    }
    if (!tutor || tutor.role !== "tutor") {
      return NextResponse.json({ error: "先輩情報が見つかりません" }, { status: 404 });
    }

    let requestId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("requests")
      .select("id")
      .eq("requester_id", user.id)
      .eq("tutor_id", safeTutorId)
      .in("status", ["appointment_pending", "pending", "accepted", "payment_pending", "escrow_pending", "escrowed", "in_progress", "review_pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      requestId = existing.id;
    } else {
      const title = `事前相談: ${tutor.full_name ?? "先輩"}にメッセージ`;
      const { data: created, error: createError } = await supabaseAdmin
        .from("requests")
        .insert({
          requester_id: user.id,
          tutor_id: safeTutorId,
          title,
          description: "決済前の事前相談メッセージ",
          budget: 0,
          status: "appointment_pending"
        })
        .select("id")
        .single();
      if (createError || !created) {
        return NextResponse.json({ error: createError?.message ?? "事前相談の作成に失敗しました" }, { status: 500 });
      }
      requestId = created.id;
    }

    const insert = await supabaseAdmin.from("messages").insert({
      request_id: requestId,
      sender_id: user.id,
      content: initialMessage,
      message_kind: "prepay"
    });

    if (insert.error) {
      const fallbackInsert = await supabaseAdmin.from("messages").insert({
        request_id: requestId,
        sender_id: user.id,
        content: initialMessage
      });
      if (fallbackInsert.error) {
        return NextResponse.json({ error: fallbackInsert.error.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        requestId
      });
    }

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start prepay message";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
