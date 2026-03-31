import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

function isMissingVerificationTable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("tutor_verifications") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("relation"))
  );
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const { ip, userAgent } = getRequestMeta(req);

    const primary = await supabaseAdmin
      .from("tutor_verifications")
      .select("id, user_id, status, reason, student_id_front_image_path, student_id_back_image_path, admission_year, graduation_year, reviewed_at, created_at")
      .order("created_at", { ascending: false });

    if (primary.error) {
      if (isMissingVerificationTable(primary.error.message)) {
        return NextResponse.json(
          {
            error:
              "DB migration not applied: table tutor_verifications is missing. Run supabase/schema.sql in Supabase SQL Editor."
          },
          { status: 503 }
        );
      }

      const fallback = await supabaseAdmin
        .from("tutor_verifications")
        .select("id, user_id, status, reason, student_id_image_path, reviewed_at, created_at")
        .order("created_at", { ascending: false });
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      const fallbackData = (fallback.data ?? []).map((row) => ({
        ...row,
        student_id_front_image_path: row.student_id_image_path,
        student_id_back_image_path: null,
        admission_year: null,
        graduation_year: null
      }));
      return await buildResponse(fallbackData, supabaseAdmin);
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "verification_admin_list_viewed",
      resource_type: "verification",
      result: "success",
      ip,
      user_agent: userAgent
    });
    return await buildResponse(primary.data ?? [], supabaseAdmin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Admin") ? 403 : 401 }
    );
  }
}

async function buildResponse(
  rowsInput: Array<{
    id: string;
    user_id: string;
    status: string;
    reason: string | null;
    student_id_front_image_path: string | null;
    student_id_back_image_path: string | null;
    admission_year: number | null;
    graduation_year: number | null;
    reviewed_at: string | null;
    created_at: string;
  }>,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
) {
    const userIds = [...new Set(rowsInput.map((row) => row.user_id))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
    }

    const rows = await Promise.all(
      rowsInput.map(async (row) => {
        const [{ data: signedFront }, { data: signedBack }] = await Promise.all([
          row.student_id_front_image_path
            ? supabaseAdmin.storage
                .from("student-ids")
                .createSignedUrl(row.student_id_front_image_path, 60 * 10)
            : Promise.resolve({ data: null, error: null }),
          row.student_id_back_image_path
            ? supabaseAdmin.storage
                .from("student-ids")
                .createSignedUrl(row.student_id_back_image_path, 60 * 10)
            : Promise.resolve({ data: null, error: null })
        ]);
        return {
          ...row,
          full_name: nameMap[row.user_id] ?? "Unknown User",
          front_image_url: signedFront?.signedUrl ?? null,
          back_image_url: signedBack?.signedUrl ?? null
        };
      })
    );

    return NextResponse.json({ items: rows });
}
