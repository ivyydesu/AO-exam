import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getCallAccessContext } from "../../../../../lib/calls";
import { getAppModeFromRequest } from "../../../../../lib/appMode";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const appMode = getAppModeFromRequest(req);
    const testMode = appMode === "test" || process.env.NODE_ENV !== "production";
    await getCallAccessContext(supabaseAdmin, params.id, user.id, { testMode });

    const now = new Date().toISOString();
    const { data: row, error: fetchError } = await supabaseAdmin
      .from("call_participants")
      .select("id")
      .eq("request_id", params.id)
      .eq("user_id", user.id)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);

    if (row?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("call_participants")
        .update({ left_at: now })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
    }

    await supabaseAdmin.from("call_events").insert({
      request_id: params.id,
      user_id: user.id,
      event_type: "left",
      metadata: {}
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "退室処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
