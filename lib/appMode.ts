import { NextRequest } from "next/server";

export type AppMode = "test" | "production";

export function getAppModeFromRequest(req: NextRequest): AppMode {
  const isProd = process.env.NODE_ENV === "production";
  const envAllowsTest = process.env.ALLOW_TEST_MODE === "true";

  if (!isProd && (process.env.APP_MODE_DEFAULT === "test" || envAllowsTest)) {
    return "test";
  }

  if (isProd && !envAllowsTest) {
    return "production";
  }

  const mode = req.cookies.get("app_mode")?.value;
  if (mode === "test" || mode === "production") return mode;
  return "production";
}
