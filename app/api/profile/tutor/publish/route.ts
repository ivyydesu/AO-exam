import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const { isPublished } = await req.json();
    const publish = Boolean(isPublished);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: roleRow } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!roleRow || roleRow.role !== "tutor") {
      return NextResponse.json({ error: "Only tutor can publish profile" }, { status: 403 });
    }

    if (publish) {
      const { data: verification } = await supabaseAdmin
        .from("tutor_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (verification?.status !== "approved") {
        return NextResponse.json(
          { error: "学生証認証が未承認です。承認後にプロフィール公開できます。" },
          { status: 403 }
        );
      }
    }

    let { error } = await supabaseAdmin
      .from("tutor_profiles")
      .upsert(
        {
          user_id: user.id,
          is_published: publish,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

    if (error && error.message.toLowerCase().includes("is_published")) {
      return NextResponse.json(
        { error: "DB列 is_published が未作成です。supabase/schema.sql を実行してください。" },
        { status: 400 }
      );
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, isPublished: publish });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update publish state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
