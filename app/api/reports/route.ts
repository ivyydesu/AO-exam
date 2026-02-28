import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const reportType = String(body.reportType ?? "other").trim();
    const category = String(body.category ?? "").trim();
    const details = String(body.details ?? "").trim();
    const targetUserId = body.targetUserId ? String(body.targetUserId).trim() : null;
    const requestId = body.requestId ? String(body.requestId).trim() : null;

    if (!category || !details) {
      return NextResponse.json({ error: "category と details は必須です" }, { status: 400 });
    }

    if (!["user", "request", "message", "call", "other"].includes(reportType)) {
      return NextResponse.json({ error: "reportType が不正です" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("reports")
      .insert({
        reporter_id: user.id,
        target_user_id: targetUserId,
        request_id: requestId,
        report_type: reportType,
        category,
        details,
        status: "open"
      })
      .select("id, status, created_at")
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
