import { NextRequest } from "next/server";

export type AppMode = "test" | "production";

export function getAppModeFromRequest(req: NextRequest): AppMode {
  const mode = req.cookies.get("app_mode")?.value;
  if (mode === "test" || mode === "production") return mode;
  return "production";
}

