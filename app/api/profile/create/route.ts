import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { sanitizePlainText } from "../../../../lib/security/input";
import { isAllowedAdminEmail } from "../../../../lib/auth/adminAllowlist";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const { id, full_name, role, school } = await req.json();
    const safeName = sanitizePlainText(String(full_name ?? ""), 80);
    const safeSchool = sanitizePlainText(String(school ?? ""), 120);

    if (!id || !safeName || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (id !== user.id) {
      return NextResponse.json({ error: "他ユーザーのプロフィールは作成できません" }, { status: 403 });
    }
    if (!["student", "tutor", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (role === "admin" && !isAllowedAdminEmail(user.email)) {
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
          role,
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
