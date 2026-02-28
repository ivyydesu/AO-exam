import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getCallAccessContext } from "../../../../../lib/calls";
import { getAppModeFromRequest } from "../../../../../lib/appMode";

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
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const appMode = getAppModeFromRequest(req);
    const testMode = appMode === "test" || process.env.NODE_ENV !== "production";
    const context = await getCallAccessContext(supabaseAdmin, params.id, user.id, { testMode });
    const body = await req.json().catch(() => ({}));
    const eventType = String(body.eventType ?? "");
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!ALLOWED.has(eventType)) {
      return NextResponse.json({ error: "eventTypeが不正です" }, { status: 400 });
    }

    if ((eventType === "recording_started" || eventType === "recording_stopped" || eventType === "session_ended") && !context.canManage) {
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

    return NextResponse.json({ ok: true, event: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "通話イベントの保存に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
