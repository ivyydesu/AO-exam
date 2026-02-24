import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";

function isMissingVerificationTable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("tutor_verifications") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("relation"))
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("tutor_verifications")
      .select("id, user_id, status, reason, student_id_image_path, reviewed_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingVerificationTable(error.message)) {
        return NextResponse.json(
          {
            error:
              "DB migration not applied: table tutor_verifications is missing. Run supabase/schema.sql in Supabase SQL Editor."
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
    }

    const rows = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("student-ids")
          .createSignedUrl(row.student_id_image_path, 60 * 10);
        return {
          ...row,
          full_name: nameMap[row.user_id] ?? "Unknown User",
          image_url: signed?.signedUrl ?? null
        };
      })
    );

    return NextResponse.json({ items: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
