import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { getAppModeFromRequest } from "../../../../lib/appMode";
import { NextRequest } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireStrictAdminFromBearer(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appMode = getAppModeFromRequest(req);
  const checks: Record<string, string> = {};

  try {
    const supabase = getSupabaseAdmin();

    const [{ error: reqErr }, { error: detailErr }, { error: profileErr }] = await Promise.all([
      supabase.from("requests").select("id", { head: true, count: "exact" }),
      supabase.from("request_details").select("request_id", { head: true, count: "exact" }),
      supabase.from("profiles").select("id, role", { head: true, count: "exact" })
    ]);

    checks.requests_table = reqErr ? `error: ${reqErr.message}` : "ok";
    checks.request_details_table = detailErr ? `error: ${detailErr.message}` : "ok";
    checks.profiles_table = profileErr ? `error: ${profileErr.message}` : "ok";
  } catch (error) {
    checks.db = `exception: ${error instanceof Error ? error.message : "unknown"}`;
  }

  checks.stripe_secret_key = process.env.STRIPE_SECRET_KEY ? "ok" : "missing";
  checks.platform_fee_percent = process.env.PLATFORM_FEE_PERCENT ? "ok" : "missing(default=30)";
  checks.app_url = process.env.NEXT_PUBLIC_APP_URL ? "ok" : "missing";
  checks.line_messaging_token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ? "ok" : "missing";

  return NextResponse.json({
    ok: Object.values(checks).every((value) => value.startsWith("ok") || value.includes("default")),
    appMode,
    checks
  });
}
