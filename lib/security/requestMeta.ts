import type { NextRequest } from "next/server";

export function getRequestMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = req.ip ?? (forwardedFor ? forwardedFor.split(",")[0]?.trim() ?? null : null);
  const userAgent = req.headers.get("user-agent");
  return {
    ip,
    userAgent
  };
}
