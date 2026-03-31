import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { admin2faCookieName, verifyAdmin2faCookieValue } from "../../../../../lib/auth/admin2faCookie";
import { isAllowedAdminEmail } from "../../../../../lib/auth/adminAllowlist";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    if (!isAllowedAdminEmail(user.email)) {
      return NextResponse.json({ ok: false, passed: false, admin: false }, { status: 403 });
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { data: me, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !me || me.role !== "admin") {
      return NextResponse.json({ ok: false, passed: false, admin: false }, { status: 403 });
    }

    const raw = req.cookies.get(admin2faCookieName())?.value;
    const passed = verifyAdmin2faCookieValue(raw, user.id);
    return NextResponse.json({ ok: true, admin: true, passed });
  } catch {
    return NextResponse.json({ ok: false, passed: false, admin: false }, { status: 401 });
  }
}
