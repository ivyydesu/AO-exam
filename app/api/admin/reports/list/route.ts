import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const status = req.nextUrl.searchParams.get("status");

    let query = supabaseAdmin
      .from("reports")
      .select("id, reporter_id, target_user_id, request_id, report_type, category, details, status, admin_note, reviewed_by, reviewed_at, updated_at, created_at")
      .order("created_at", { ascending: false });

    if (status && ["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
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
      reporter_name: profileMap[item.reporter_id]?.full_name ?? "Unknown",
      reporter_role: profileMap[item.reporter_id]?.role ?? "",
      target_name: item.target_user_id ? profileMap[item.target_user_id]?.full_name ?? "Unknown" : null,
      target_role: item.target_user_id ? profileMap[item.target_user_id]?.role ?? "" : null,
      reviewed_by_name: item.reviewed_by ? profileMap[item.reviewed_by]?.full_name ?? "Unknown" : null
    }));

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
