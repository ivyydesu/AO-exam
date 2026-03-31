import { NextRequest } from "next/server";

function normalizeOrigin(origin: string) {
  try {
    const u = new URL(origin);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export function assertTrustedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const expected = normalizeOrigin(`${proto}://${host}`);
  const appUrl = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || "");

  if (!origin && !referer) return;

  const candidate = normalizeOrigin(origin || referer || "");
  const trusted = new Set([expected, appUrl].filter(Boolean));
  if (!candidate || !trusted.has(candidate)) {
    throw new Error("CSRF blocked: untrusted origin");
  }
}

