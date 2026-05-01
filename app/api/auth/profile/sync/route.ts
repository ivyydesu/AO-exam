import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { isAllowedAdminEmail } from "../../../../../lib/auth/adminAllowlist";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";

type CanonicalRole = "student" | "tutor" | "admin";

type SyncBody = {
  roleHint?: "student" | "tutor";
};

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
};

function normalizeRole(raw: unknown): CanonicalRole | null {
  const normalized = String(raw ?? "").trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();

  const tutorRoles = new Set(["tutor", "mentor", "university", "university_student", "college_student", "大学生", "先輩"]);
  if (
    tutorRoles.has(lower) ||
    tutorRoles.has(normalized) ||
    lower.includes("tutor") ||
    lower.includes("mentor") ||
    lower.includes("university") ||
    normalized.includes("大学")
  ) {
    return "tutor";
  }

  const studentRoles = new Set(["student", "highschool", "high_school", "高校生"]);
  if (studentRoles.has(lower) || studentRoles.has(normalized) || lower.includes("student") || normalized.includes("高校")) {
    return "student";
  }

  const adminRoles = new Set(["admin", "administrator", "運営", "管理者"]);
  if (adminRoles.has(lower) || adminRoles.has(normalized) || lower.includes("admin") || normalized.includes("運営") || normalized.includes("管理")) {
    return "admin";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);

    const currentUser = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    let roleHint: "student" | "tutor" = "student";
    try {
      const payload = (await req.json()) as SyncBody;
      roleHint = payload.roleHint === "tutor" ? "tutor" : "student";
    } catch {
      roleHint = "student";
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", currentUser.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const normalizedRegisteredRole = normalizeRole(currentUser.user_metadata?.role);

    if (!profile) {
      const createRole =
        normalizedRegisteredRole === "admin" && !isAllowedAdminEmail(currentUser.email)
          ? roleHint
          : (normalizedRegisteredRole ?? roleHint);
      const fallbackName = (currentUser.email?.split("@")[0] ?? "ユニブリ User").slice(0, 40);

      const { error: insertError } = await supabaseAdmin.from("profiles").insert({
        id: currentUser.id,
        full_name: fallbackName,
        role: createRole,
        school: null
      });

      if (insertError) {
        return NextResponse.json({ error: `プロフィール初期化に失敗しました: ${insertError.message}` }, { status: 500 });
      }

      return NextResponse.json({ role: createRole });
    }

    const normalizedProfileRole = normalizeRole(profile.role);
    let resolvedRole: CanonicalRole = normalizedProfileRole ?? normalizedRegisteredRole ?? roleHint;
    if (resolvedRole === "admin" && !isAllowedAdminEmail(currentUser.email)) {
      resolvedRole = "student";
    }

    const currentProfileRole = String(profile.role ?? "").trim();
    if (currentProfileRole !== resolvedRole) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ role: resolvedRole })
        .eq("id", currentUser.id);

      if (updateError) {
        return NextResponse.json({ error: `プロフィール権限の同期に失敗しました: ${updateError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ role: resolvedRole });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync profile";
    const status =
      message.includes("Missing Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
