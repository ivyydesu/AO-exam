import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettings,
  getNotificationSettingsForUser
} from "../../../../lib/notificationSettings";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const settings = await getNotificationSettingsForUser(supabaseAdmin, user.id);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const payload = (await req.json()) as Partial<NotificationSettings>;
    const supabaseAdmin = getSupabaseAdmin();

    const update: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...payload
    };

    const { error } = await supabaseAdmin.from("notification_settings").upsert(
      {
        user_id: user.id,
        ...update,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, settings: update });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
