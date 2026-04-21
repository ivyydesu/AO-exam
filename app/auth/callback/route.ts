import { NextRequest, NextResponse } from "next/server";
import { resolveAppUrl } from "../../../lib/auth/appUrl";
function normalizeNextPath(raw: string | null) {
  if (!raw) return "/home";
  return raw.startsWith("/") ? raw : "/home";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextPath = normalizeNextPath(url.searchParams.get("next"));
  const baseUrl = resolveAppUrl(req.nextUrl.origin);
  const redirectUrl = new URL("/auth/login", baseUrl);

  if (!code) {
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Exchange is handled on /auth/login using the browser Supabase client
  // to avoid requiring @supabase/ssr in this route.
  redirectUrl.searchParams.set("code", code);
  redirectUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(redirectUrl.toString());
}
