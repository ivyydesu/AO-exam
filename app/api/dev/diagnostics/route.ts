import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireStrictAdminFromBearer(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceKey),
    LINE_LOGIN_CHANNEL_ID: Boolean(process.env.LINE_LOGIN_CHANNEL_ID),
    LINE_LOGIN_CHANNEL_SECRET: Boolean(process.env.LINE_LOGIN_CHANNEL_SECRET),
    LINE_LOGIN_REDIRECT_URI: Boolean(process.env.LINE_LOGIN_REDIRECT_URI),
    LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: Boolean(process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN),
    INTERNAL_API_SECRET: Boolean(process.env.INTERNAL_API_SECRET)
  };

  const checks: Record<string, string> = {};

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" });
    checks.supabase = error ? `error: ${error.message}` : "ok";
  } catch (e) {
    checks.supabase = `exception: ${e instanceof Error ? e.message : "unknown"}`;
  }

  try {
    if (!supabaseUrl || !serviceKey) throw new Error("supabase env missing");
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });
    checks.supabase_rest = `http_${res.status}`;
  } catch (e) {
    checks.supabase_rest = `exception: ${e instanceof Error ? e.message : "unknown"}`;
  }

  return NextResponse.json({
    ok: Object.values(env).every(Boolean),
    nodeEnv: process.env.NODE_ENV,
    env,
    checks
  });
}
