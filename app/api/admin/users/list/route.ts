import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";

type VerificationMap = Record<string, { status: string; reviewed_at: string | null }>;
type ProfileRow = {
  id: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
  school: string | null;
  created_at: string;
  is_suspended: boolean;
  suspended_until: string | null;
  suspended_reason: string | null;
};
type VerificationRow = {
  user_id: string;
  status: string;
  reviewed_at: string | null;
};

function isMissingSuspendColumns(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("is_suspended") ||
    lower.includes("suspended_until") ||
    lower.includes("suspended_reason")
  );
}

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

    const role = req.nextUrl.searchParams.get("role");
    const keyword = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();

    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, school, created_at, is_suspended, suspended_until, suspended_reason")
      .order("created_at", { ascending: false });

    if (role && ["student", "tutor", "admin"].includes(role)) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingSuspendColumns(error.message)) {
        return NextResponse.json(
          { error: "DB migration not applied: profiles suspension columns are missing. Run supabase/schema.sql." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as ProfileRow[];
    const userIds = rows.map((row) => row.id);

    let verificationMap: VerificationMap = {};
    if (userIds.length > 0) {
      const { data: verifications } = await supabaseAdmin
        .from("tutor_verifications")
        .select("user_id, status, reviewed_at")
        .in("user_id", userIds);

      verificationMap = Object.fromEntries(
        ((verifications ?? []) as VerificationRow[]).map((item) => [
          item.user_id,
          { status: item.status, reviewed_at: item.reviewed_at }
        ])
      );
    }

    const filtered = rows.filter((row) => {
      if (!keyword) return true;
      return (
        row.full_name.toLowerCase().includes(keyword) ||
        row.school?.toLowerCase().includes(keyword) ||
        row.id.toLowerCase().includes(keyword)
      );
    });

    const items = filtered.map((row) => ({
      ...row,
      verification_status: verificationMap[row.id]?.status ?? null,
      verification_reviewed_at: verificationMap[row.id]?.reviewed_at ?? null
    }));

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
