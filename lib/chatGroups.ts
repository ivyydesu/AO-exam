import { SupabaseClient } from "@supabase/supabase-js";

export async function ensurePaidChatGroup(
  supabaseAdmin: SupabaseClient,
  requestId: string,
  studentId: string,
  tutorId: string
) {
  const { error } = await supabaseAdmin.from("chat_groups").upsert(
    {
      request_id: requestId,
      student_id: studentId,
      tutor_id: tutorId,
      group_type: "paid"
    },
    { onConflict: "request_id" }
  );
  return { error };
}
