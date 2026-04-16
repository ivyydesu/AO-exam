import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { sanitizePlainText } from "../../../../lib/security/input";
import { isAllowedAdminEmail } from "../../../../lib/auth/adminAllowlist";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type CanonicalRole = "student" | "tutor" | "admin";

function normalizeRole(raw: unknown): CanonicalRole | null {
  const normalized = String(raw ?? "").trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();

  const tutorRoles = new Set(["tutor", "mentor", "university", "university_student", "college_student", "大学生", "先輩"]);
  if (tutorRoles.has(lower) || tutorRoles.has(normalized) || lower.includes("tutor") || lower.includes("mentor") || lower.includes("university") || normalized.includes("大学")) {
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
    const user = await requireUserFromBearerToken(req);
    const { id, full_name, role, school } = await req.json();
    const normalizedRole = normalizeRole(role);
    const safeName = sanitizePlainText(String(full_name ?? ""), 80);
    const safeSchool = sanitizePlainText(String(school ?? ""), 120);

    if (!id || !safeName || !normalizedRole) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (id !== user.id) {
      return NextResponse.json({ error: "他ユーザーのプロフィールは作成できません" }, { status: 403 });
    }
    if (normalizedRole === "admin" && !isAllowedAdminEmail(user.email)) {
      return NextResponse.json({ error: "Admin role is restricted" }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let error: { message: string; code?: string } | null = null;

    // Supabase Auth直後は auth.users 反映が遅れることがあるため、FKエラー時は短時間リトライ
    for (let i = 0; i < 8; i += 1) {
      const result = await supabaseAdmin.from("profiles").upsert(
        {
          id,
          full_name: safeName,
          role: normalizedRole,
          school: safeSchool
        },
        { onConflict: "id" }
      );
      error = result.error;
      if (!error) break;
      if (error.code !== "23503") break;
      await wait(350);
    }

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Authユーザー作成の反映待ちです。3秒ほど待って再実行してください。" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
    const currentMetadata = authUser?.user?.user_metadata;
    const currentMetadataRole = normalizeRole(currentMetadata?.role);
    if (currentMetadataRole !== normalizedRole) {
      await supabaseAdmin.auth.admin
        .updateUserById(id, {
          user_metadata: {
            ...(currentMetadata ?? {}),
            role: normalizedRole
          }
        })
        .catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile create route failed";
    const status = message.includes("Authorization") || message.includes("Invalid user token")
      ? 401
      : message.includes("CSRF blocked")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
