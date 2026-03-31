import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import {
  admin2faCookieName,
  admin2faMaxAgeSeconds,
  createAdmin2faCookieValue
} from "../../../../../lib/auth/admin2faCookie";
import { isAllowedAdminEmail } from "../../../../../lib/auth/adminAllowlist";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    if (!isAllowedAdminEmail(user.email)) {
      return NextResponse.json({ error: "Admin email not allowed" }, { status: 403 });
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { data: me, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(admin2faCookieName(), createAdmin2faCookieValue(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: admin2faMaxAgeSeconds()
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
