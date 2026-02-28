import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { getCallAccessContext } from "../../../../../lib/calls";
import { getAppModeFromRequest } from "../../../../../lib/appMode";
import { buildDailyRoomUrl, createDailyMeetingToken, ensureDailyRoom, generateDailyRoomName } from "../../../../../lib/daily";
import { isDailyProvisioningError, isVideoCallsEnabled, sanitizeVideoCallError } from "../../../../../lib/videoCalls";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = me?.role === "admin";

    if (!isVideoCallsEnabled()) {
      return NextResponse.json(
        { error: isAdmin ? "VIDEO_CALLS_ENABLED が false のため通話機能は停止中です" : "現在ビデオ通話機能は利用できません" },
        { status: 503 }
      );
    }

    const appMode = getAppModeFromRequest(req);
    const testMode = appMode === "test" || process.env.NODE_ENV !== "production";
    const context = await getCallAccessContext(supabaseAdmin, params.id, user.id, { testMode });

    let { data: session, error: sessionError } = await supabaseAdmin
      .from("call_sessions")
      .select("*")
      .eq("request_id", params.id)
      .maybeSingle();

    if (sessionError) throw new Error(sessionError.message);

    const roomName = session?.room_name || generateDailyRoomName(params.id);
    const room = await ensureDailyRoom(roomName);

    if (!session || session.ended_at) {
      const payload = {
        request_id: params.id,
        room_name: room.name,
        room_password: "daily-managed",
        moderator_user_id: context.request.tutor_id ?? context.request.requester_id,
        recording_status: "idle",
        created_by: user.id,
        started_at: new Date().toISOString(),
        ended_at: null,
        updated_at: new Date().toISOString()
      };
      const { data: created, error: createError } = await supabaseAdmin
        .from("call_sessions")
        .upsert(payload, { onConflict: "request_id" })
        .select("*")
        .single();
      if (createError || !created) throw new Error(createError?.message ?? "通話セッションの作成に失敗しました");
      session = created;
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("call_sessions")
        .update({ updated_at: new Date().toISOString(), ended_at: null })
        .eq("request_id", params.id);
      if (updateError) throw new Error(updateError.message);
    }

    const token = await createDailyMeetingToken({
      roomName: room.name,
      userName: user.user_metadata?.full_name || user.email || "AO Match User",
      userId: user.id,
      isOwner: context.canManage
    });

    await supabaseAdmin.from("call_participants").insert({
      request_id: params.id,
      user_id: user.id,
      participant_role: context.role,
      is_moderator: session.moderator_user_id === user.id,
      joined_at: new Date().toISOString(),
      left_at: null
    });

    await supabaseAdmin.from("call_events").insert({
      request_id: params.id,
      user_id: user.id,
      event_type: "joined",
      metadata: { provider: "daily", participantRole: context.role }
    });

    const participantIds = [context.request.requester_id, context.request.tutor_id].filter(Boolean) as string[];
    const [{ data: baseProfiles }, { data: tutorProfiles }, { data: events }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, role, school").in("id", participantIds),
      supabaseAdmin.from("tutor_profiles").select("user_id, avatar_url").in("user_id", participantIds),
      supabaseAdmin
        .from("call_events")
        .select("id, event_type, metadata, created_at, user_id")
        .eq("request_id", params.id)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    const avatarMap = Object.fromEntries((tutorProfiles ?? []).map((item) => [item.user_id, item.avatar_url ?? ""]));
    const participants = (baseProfiles ?? []).map((item) => ({
      id: item.id,
      name: item.full_name,
      role: item.role,
      school: item.school,
      avatarUrl: avatarMap[item.id] ?? ""
    }));

    return NextResponse.json({
      ok: true,
      provider: "daily",
      roomName: room.name,
      roomUrl: room.url || buildDailyRoomUrl(room.name),
      token: token.token,
      canManage: context.canManage,
      role: context.role,
      session: {
        roomName: room.name,
        moderatorUserId: session.moderator_user_id,
        recordingStatus: session.recording_status,
        startedAt: session.started_at
      },
      participants,
      events: events ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily通話情報の取得に失敗しました";
    console.error("daily call bootstrap error:", message);
    const hiddenMessage = sanitizeVideoCallError(message);
    return NextResponse.json({ error: hiddenMessage }, { status: isDailyProvisioningError(message) ? 503 : 400 });
  }
}
