import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { id, full_name, role, school } = await req.json();

    if (!id || !full_name || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let error: { message: string; code?: string } | null = null;

    // Supabase Auth直後は auth.users 反映が遅れることがあるため、FKエラー時は短時間リトライ
    for (let i = 0; i < 8; i += 1) {
      const result = await supabaseAdmin.from("profiles").upsert(
        {
          id,
          full_name,
          role,
          school
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
