import type { SupabaseClient } from "@supabase/supabase-js";

type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
  type?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function createNotification(
  supabaseAdmin: SupabaseClient,
  input: CreateNotificationInput
) {
  const payload = {
    user_id: input.userId,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    type: input.type ?? "system",
    meta: input.meta ?? null
  };

  const { error } = await supabaseAdmin.from("notifications").insert(payload);
  if (error) {
    // Schema not migrated yet should not block main business flow.
    const isSchemaError =
      error.message.includes("notifications") &&
      (error.message.includes("schema cache") ||
        error.message.includes("does not exist") ||
        error.message.includes("Could not find"));
    if (isSchemaError) return;
    throw error;
  }
}
