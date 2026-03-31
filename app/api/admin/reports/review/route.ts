import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const { user, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const limit = await consumeRateLimit(`admin:reports:review:${user.id}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const { ip, userAgent } = getRequestMeta(req);
    const body = await req.json().catch(() => ({}));

    const reportId = String(body.reportId ?? "").trim();
    const status = String(body.status ?? "").trim();
    const adminNote = String(body.adminNote ?? "").trim();

    if (!reportId || !["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "reportId または status が不正です" }, { status: 400 });
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
      const missingReportsTable =
        error.message.includes("Could not find the table 'public.reports'") ||
        error.message.toLowerCase().includes("relation \"reports\" does not exist");
      if (missingReportsTable) {
        return NextResponse.json(
          {
            error: "DBに reports テーブルがありません。Supabase SQLを実行してスキーマを反映してください。",
            code: "REPORTS_TABLE_MISSING"
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "admin_report_reviewed",
      resource_type: "report",
      resource_id: reportId,
      result: "success",
      detail: `status=${status}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") || message.includes("Admin") ? 403 : 401 }
    );
  }
}
