import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";

const PUBLISH_COLUMNS = ["is_published", "is_public"] as const;

function isMissingColumnError(message: string, column: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes(`column "${column}"`) ||
    normalized.includes(`column ${column}`) ||
    normalized.includes(`'${column}'`)
  );
}

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
    const mentorRoles = new Set(["tutor", "university"]);
    if (!roleRow || !mentorRoles.has(String(roleRow.role))) {
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

    let persistedColumn: (typeof PUBLISH_COLUMNS)[number] | null = null;
    let upsertError: string | null = null;

    for (const column of PUBLISH_COLUMNS) {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        updated_at: new Date().toISOString()
      };
      payload[column] = publish;

      const { error } = await supabaseAdmin
        .from("tutor_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (!error) {
        persistedColumn = column;
        upsertError = null;
        break;
      }

      upsertError = error.message;
      if (isMissingColumnError(error.message, column)) {
        continue;
      }
      break;
    }

    if (!persistedColumn) {
      const fallbackMessage = "DB列 is_published / is_public が未作成です。supabase/schema.sql を確認してください。";
      return NextResponse.json({ error: upsertError ?? fallbackMessage }, { status: 400 });
    }

    return NextResponse.json({ ok: true, isPublished: publish, persistedColumn });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update publish state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
