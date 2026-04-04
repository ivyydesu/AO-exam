import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

function isMissingReportsDetailsColumn(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("column reports.details does not exist") ||
    m.includes("could not find the 'details' column") ||
    (m.includes("details") && m.includes("reports") && m.includes("schema cache"))
  );
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const { ip, userAgent } = getRequestMeta(req);

    const status = req.nextUrl.searchParams.get("status");
    const reportType = req.nextUrl.searchParams.get("reportType");

    let query = supabaseAdmin
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && ["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      query = query.eq("status", status);
    }
    if (reportType && ["user", "request", "message", "call", "other"].includes(reportType)) {
      query = query.eq("report_type", reportType);
    }

    let { data, error } = await query;
    if (error && isMissingReportsDetailsColumn(error.message)) {
      let fallbackQuery = supabaseAdmin
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (status && ["open", "reviewing", "resolved", "dismissed"].includes(status)) {
        fallbackQuery = fallbackQuery.eq("status", status);
      }
      if (reportType && ["user", "request", "message", "call", "other"].includes(reportType)) {
        fallbackQuery = fallbackQuery.eq("report_type", reportType);
      }
      const fallback = await fallbackQuery;
      data = (fallback.data ?? []).map((row) => ({
        ...row,
        details: (row as { details?: string; detail?: string }).details ?? (row as { detail?: string }).detail ?? ""
      }));
      error = fallback.error;
    }
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

    const profileIds = [
      ...new Set(
        (data ?? [])
          .flatMap((item) => [item.reporter_id, item.target_user_id, item.reviewed_by])
          .filter(Boolean)
      )
    ] as string[];

    let profileMap: Record<string, { full_name: string; role: string }> = {};
    if (profileIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role")
        .in("id", profileIds);
      profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, { full_name: p.full_name, role: p.role }]));
    }

    const items = (data ?? []).map((item) => ({
      ...item,
      details: (item as { details?: string; detail?: string }).details ?? (item as { detail?: string }).detail ?? "",
      reporter_name: profileMap[item.reporter_id]?.full_name ?? "Unknown",
      reporter_role: profileMap[item.reporter_id]?.role ?? "",
      target_name: item.target_user_id ? profileMap[item.target_user_id]?.full_name ?? "Unknown" : null,
      target_role: item.target_user_id ? profileMap[item.target_user_id]?.role ?? "" : null,
      reviewed_by_name: item.reviewed_by ? profileMap[item.reviewed_by]?.full_name ?? "Unknown" : null
    }));

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "admin_reports_list_viewed",
      resource_type: "report",
      result: "success",
      detail: `status=${status || "-"} type=${reportType || "-"}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Admin") ? 403 : 401 }
    );
  }
}
