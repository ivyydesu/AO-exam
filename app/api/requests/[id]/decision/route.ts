import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { sendLinePushMessage } from "../../../../../lib/line";
import { getNotificationSettingsForUser } from "../../../../../lib/notificationSettings";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`requests:decision:${user.id}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `操作が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const requestId = params.id;
    const body = await req.json();
    const action = String(body.action ?? "");

    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const [{ data: me, error: meError }, { data: requestRow, error: requestError }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
      .from("requests_with_profile")
      .select("id, status, tutor_id, requester_id, title")
      .eq("id", requestId)
      .single()
    ]);

    if (meError || !me || me.role !== "tutor") {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "request_decision_blocked",
        resource_type: "request",
        resource_id: requestId,
        result: "failure",
        detail: "non-tutor tried decision",
        ip: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent")
      });
      return NextResponse.json({ error: "Tutor only" }, { status: 403 });
    }

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (requestRow.tutor_id && requestRow.tutor_id !== user.id) {
      return NextResponse.json({ error: "この依頼の担当ではありません" }, { status: 403 });
    }

    if (!["draft", "rejected", "accepted"].includes(requestRow.status)) {
      return NextResponse.json({ error: `現在のステータスでは操作できません: ${requestRow.status}` }, { status: 400 });
    }

    if (action === "approve") {
      const { error: updateError } = await supabaseAdmin
        .from("requests")
        .update({
          tutor_id: user.id,
          status: "accepted"
        })
        .eq("id", requestId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "request_approved",
        resource_type: "request",
        resource_id: requestId,
        result: "success",
        ip: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent")
      });

      const { data: requester } = await supabaseAdmin
        .from("profiles")
        .select("line_user_id")
        .eq("id", requestRow.requester_id)
        .maybeSingle();

      if (requester?.line_user_id) {
        const requesterSettings = await getNotificationSettingsForUser(
          supabaseAdmin,
          requestRow.requester_id
        );
        if (requesterSettings.line_enabled && requesterSettings.line_status_update) {
          try {
            await sendLinePushMessage(
              requester.line_user_id,
              `【ユニブリ 通知】依頼が承認されました\n` +
                `--------------------------------\n` +
                `件名: ${requestRow.title}\n` +
                `状態: 支払い待ち\n` +
                `次の操作: ユニブリで決済を完了してください`
            );
          } catch {
            // 通知失敗は処理続行
          }
        }
      }

      return NextResponse.json({ ok: true, status: "accepted" });
    }

    const { error: rejectError } = await supabaseAdmin
      .from("requests")
      .update({
        tutor_id: user.id,
        status: "rejected"
      })
      .eq("id", requestId);
    if (rejectError) {
      return NextResponse.json({ error: rejectError.message }, { status: 500 });
    }
    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "request_rejected",
      resource_type: "request",
      resource_id: requestId,
      result: "success",
      ip: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update request";
    const status = message.includes("CSRF blocked") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
