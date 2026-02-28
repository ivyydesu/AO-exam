import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { sendLinePushMessage } from "../../../../../lib/line";
import { getNotificationSettingsForUser } from "../../../../../lib/notificationSettings";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("line_user_id, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (!profile.line_user_id) {
      return NextResponse.json({ error: "LINE未連携です" }, { status: 400 });
    }
    const notifySettings = await getNotificationSettingsForUser(supabaseAdmin, user.id);
    if (!notifySettings.line_enabled) {
      return NextResponse.json({ error: "LINE通知がOFFです。通知設定でONにしてください。" }, { status: 400 });
    }

    const now = new Date().toLocaleString("ja-JP");
    await sendLinePushMessage(
      profile.line_user_id,
      `AO Match テスト通知\nrole: ${profile.role}\n時刻: ${now}`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test LINE notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
