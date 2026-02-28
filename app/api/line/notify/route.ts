import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { sendLinePushMessage } from "../../../../lib/line";
import { getNotificationSettingsForUser } from "../../../../lib/notificationSettings";

type NotifyBody = {
  targetRole: "student" | "tutor";
  targetUserId: string;
  eventType: "new_request" | "request_approved" | "custom";
  message?: string;
};

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as NotifyBody;
    if (!body.targetUserId || !body.targetRole || !body.eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, line_user_id")
      .eq("id", body.targetUserId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (profile.role !== body.targetRole) {
      return NextResponse.json({ error: "Target role mismatch" }, { status: 400 });
    }

    if (!profile.line_user_id) {
      return NextResponse.json({ error: "LINE not connected for target user" }, { status: 400 });
    }

    const notifySettings = await getNotificationSettingsForUser(supabaseAdmin, profile.id);
    if (!notifySettings.line_enabled) {
      return NextResponse.json({ error: "LINE notifications are disabled" }, { status: 400 });
    }

    const defaultMessages: Record<NotifyBody["eventType"], string> = {
      new_request: "新しい依頼が届きました。AO Matchを確認してください。",
      request_approved: "依頼が承認されました。次のステップを確認してください。",
      custom: "AO Matchからのお知らせです。"
    };

    const text = body.message || defaultMessages[body.eventType];
    await sendLinePushMessage(profile.line_user_id, text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send LINE notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
