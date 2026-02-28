import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const reportId = String(body.reportId ?? "").trim();
    const status = String(body.status ?? "").trim();
    const adminNote = String(body.adminNote ?? "").trim();

    if (!reportId || !["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "reportId または status が不正です" }, { status: 400 });
    }

    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("reports")
      .update({
        status,
        admin_note: adminNote || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", reportId)
      .select("id, status, admin_note, reviewed_by, reviewed_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
