import { SupabaseClient } from "@supabase/supabase-js";

export type NotificationSettings = {
  email_new_request: boolean;
  email_new_message: boolean;
  email_favorite: boolean;
  email_ops: boolean;
  email_2fa_enabled: boolean;
  push_reminder: boolean;
  line_enabled: boolean;
  line_new_request: boolean;
  line_status_update: boolean;
  line_new_message: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_new_request: true,
  email_new_message: true,
  email_favorite: false,
  email_ops: true,
  email_2fa_enabled: false,
  push_reminder: true,
  line_enabled: true,
  line_new_request: true,
  line_status_update: true,
  line_new_message: true
};

export async function getNotificationSettingsForUser(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<NotificationSettings> {
  const { data, error } = await supabaseAdmin
    .from("notification_settings")
    .select(
      "email_new_request, email_new_message, email_favorite, email_ops, email_2fa_enabled, push_reminder, line_enabled, line_new_request, line_status_update, line_new_message"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // If table isn't created yet or row is absent, use safe defaults.
  if (error || !data) return DEFAULT_NOTIFICATION_SETTINGS;

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...data
  } as NotificationSettings;
}
