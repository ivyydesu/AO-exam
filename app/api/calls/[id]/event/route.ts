import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getCallAccessContext } from "../../../../../lib/calls";
import { getAppModeFromRequest } from "../../../../../lib/appMode";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

const ALLOWED = new Set([
  "joined",
  "left",
  "participant_joined",
  "participant_left",
  "recording_started",
  "recording_stopped",
  "microphone_muted",
  "microphone_unmuted",
  "camera_muted",
  "camera_unmuted",
  "screen_share_started",
  "screen_share_stopped",
  "session_ended"
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`calls:event:${user.id}`, 100, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { ip, userAgent } = getRequestMeta(req);
    const appMode = getAppModeFromRequest(req);
    const testMode = appMode === "test" || process.env.NODE_ENV !== "production";
    const context = await getCallAccessContext(supabaseAdmin, params.id, user.id, { testMode });
    const body = await req.json().catch(() => ({}));
    const eventType = String(body.eventType ?? "");
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!ALLOWED.has(eventType)) {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "call_event_invalid",
        resource_type: "call",
        resource_id: params.id,
        result: "failure",
        detail: `eventType=${eventType}`,
        ip,
        user_agent: userAgent
      });
      return NextResponse.json({ error: "eventTypeが不正です" }, { status: 400 });
    }

    if ((eventType === "recording_started" || eventType === "recording_stopped" || eventType === "session_ended") && !context.canManage) {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "call_event_denied",
        resource_type: "call",
        resource_id: params.id,
        result: "failure",
        detail: `eventType=${eventType} requires manager`,
        ip,
        user_agent: userAgent
      });
      return NextResponse.json({ error: "この操作を実行する権限がありません" }, { status: 403 });
    }

    if (eventType === "recording_started" || eventType === "recording_stopped" || eventType === "session_ended") {
      const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
      if (eventType === "recording_started") update.recording_status = "recording";
      if (eventType === "recording_stopped") update.recording_status = "idle";
      if (eventType === "session_ended") update.ended_at = new Date().toISOString();
      const { error: sessionError } = await supabaseAdmin.from("call_sessions").update(update).eq("request_id", params.id);
      if (sessionError) throw new Error(sessionError.message);
    }

    const { data, error } = await supabaseAdmin
      .from("call_events")
      .insert({
        request_id: params.id,
        user_id: user.id,
        event_type: eventType,
        metadata
      })
      .select("id, event_type, metadata, created_at, user_id")
      .single();

    if (error) throw new Error(error.message);

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "call_event_saved",
      resource_type: "call",
      resource_id: params.id,
      result: "success",
      detail: `eventType=${eventType}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({ ok: true, event: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "通話イベントの保存に失敗しました";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") ? 403 : 400 }
    );
  }
}
