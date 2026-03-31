import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { generateRoomName, generateRoomPassword, getCallAccessContext } from "../../../../../lib/calls";
import { getAppModeFromRequest } from "../../../../../lib/appMode";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const { ip, userAgent } = getRequestMeta(req);
    const appMode = getAppModeFromRequest(req);
    const testMode = appMode === "test" || process.env.NODE_ENV !== "production";
    const context = await getCallAccessContext(supabaseAdmin, params.id, user.id, { testMode });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("call_sessions")
      .select("*")
      .eq("request_id", params.id)
      .maybeSingle();

    if (sessionError) throw new Error(sessionError.message);

    const participantIds = [context.request.requester_id, context.request.tutor_id].filter(Boolean) as string[];
    const [{ data: baseProfiles }, { data: tutorProfiles }, { data: events }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, role, school").in("id", participantIds),
      supabaseAdmin.from("tutor_profiles").select("user_id, avatar_url").in("user_id", participantIds),
      supabaseAdmin.from("call_events").select("id, event_type, metadata, created_at, user_id").eq("request_id", params.id).order("created_at", { ascending: false }).limit(30)
    ]);

    const avatarMap = Object.fromEntries((tutorProfiles ?? []).map((item) => [item.user_id, item.avatar_url ?? ""]));
    const participants = (baseProfiles ?? []).map((item) => ({
      id: item.id,
      name: item.full_name,
      role: item.role,
      school: item.school,
      avatarUrl: avatarMap[item.id] ?? ""
    }));

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "call_session_viewed",
      resource_type: "call",
      resource_id: params.id,
      result: "success",
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({
      ok: true,
      session: session
        ? {
            roomName: session.room_name,
            roomPassword: session.room_password,
            moderatorUserId: session.moderator_user_id,
            recordingStatus: session.recording_status,
            endedAt: session.ended_at,
            startedAt: session.started_at
          }
        : null,
      participants,
      events: events ?? [],
      canManage: context.canManage,
      role: context.role,
      request: context.request,
      appMode: testMode ? "test" : appMode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "通話情報の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`calls:session:${user.id}`, 30, 60_000);
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

    let { data: session, error: sessionError } = await supabaseAdmin
      .from("call_sessions")
      .select("*")
      .eq("request_id", params.id)
      .maybeSingle();

    if (sessionError) throw new Error(sessionError.message);

    if (!session || session.ended_at) {
      const payload = {
        request_id: params.id,
        room_name: generateRoomName(params.id),
        room_password: generateRoomPassword(),
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
      await supabaseAdmin
        .from("call_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("request_id", params.id);
    }

    const joinPayload = {
      request_id: params.id,
      user_id: user.id,
      participant_role: context.role,
      is_moderator: session.moderator_user_id === user.id,
      joined_at: new Date().toISOString(),
      left_at: null
    };
    await supabaseAdmin.from("call_participants").insert(joinPayload);
    await supabaseAdmin.from("call_events").insert({
      request_id: params.id,
      user_id: user.id,
      event_type: "joined",
      metadata: { participantRole: context.role }
    });

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "call_session_joined",
      resource_type: "call",
      resource_id: params.id,
      result: "success",
      detail: `role=${context.role}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({
      ok: true,
      session: {
        roomName: session.room_name,
        roomPassword: session.room_password,
        moderatorUserId: session.moderator_user_id,
        recordingStatus: session.recording_status,
        startedAt: session.started_at
      },
      canManage: context.canManage,
      role: context.role,
      appMode: testMode ? "test" : appMode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "通話の開始に失敗しました";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") ? 403 : 400 }
    );
  }
}
