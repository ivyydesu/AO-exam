import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildCsp(req: NextRequest) {
  const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
  const dailyFrame = dailyDomain ? `https://${dailyDomain}` : "https://*.daily.co";
  const appOrigin = req.nextUrl.origin;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${dailyFrame}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data: https:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src 'self' ${appOrigin} https: wss:`,
    `frame-src 'self' ${dailyFrame}`
  ].join("; ");
}

function applySecurityHeaders(req: NextRequest, res: NextResponse) {
  res.headers.set("Content-Security-Policy", buildCsp(req));
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname, origin: reqOrigin } = req.nextUrl;

  // Global CSRF gate for mutation APIs.
  // Webhook / server-to-server endpoints are excluded and protected separately.
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    !pathname.startsWith("/api/stripe/webhook") &&
    !pathname.startsWith("/api/line/notify")
  ) {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const allowedOrigins = [reqOrigin, appUrl].filter((v): v is string => Boolean(v));
    const originOk = origin ? allowedOrigins.some((o) => origin.startsWith(o)) : false;
    const refererOk = referer ? allowedOrigins.some((o) => referer.startsWith(o)) : false;

    if (!originOk && !refererOk) {
      return applySecurityHeaders(
        req,
        NextResponse.json({ error: "CSRF blocked: untrusted origin" }, { status: 403 })
      );
    }
  }

  // NOTE:
  // Supabase browser auth in this app is localStorage-based.
  // Server middleware cannot reliably read that session, so
  // redirecting here causes false logouts. Route-level guards
  // are handled client-side/API-side.
  return applySecurityHeaders(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)"]
};
