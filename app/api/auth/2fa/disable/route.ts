import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { DEFAULT_NOTIFICATION_SETTINGS, getNotificationSettingsForUser } from "../../../../../lib/notificationSettings";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const current = await getNotificationSettingsForUser(supabaseAdmin, user.id);

    const next = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...current,
      email_2fa_enabled: false,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin.from("notification_settings").upsert(
      {
        user_id: user.id,
        ...next
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, enabled: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disable 2FA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
