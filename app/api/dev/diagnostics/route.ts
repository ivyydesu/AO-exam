import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let isAdminCaller = false;
  try {
    await requireStrictAdminFromBearer(req);
    isAdminCaller = true;
  } catch {
    isAdminCaller = false;
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const lineLoginRedirectUri = (process.env.LINE_LOGIN_REDIRECT_URI ?? "").trim();
  const envPublic = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    NEXT_PUBLIC_APP_URL: Boolean(appUrl)
  };
  const envAdmin = {
    SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceKey),
    LINE_LOGIN_CHANNEL_ID: Boolean(process.env.LINE_LOGIN_CHANNEL_ID),
    LINE_LOGIN_CHANNEL_SECRET: Boolean(process.env.LINE_LOGIN_CHANNEL_SECRET),
    LINE_LOGIN_REDIRECT_URI: Boolean(lineLoginRedirectUri),
    LINE_REDIRECT_URI_RESOLVABLE: Boolean(appUrl || lineLoginRedirectUri),
    LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: Boolean(process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN),
    INTERNAL_API_SECRET: Boolean(process.env.INTERNAL_API_SECRET)
  };

  const checks: Record<string, string> = {};
  let supabaseAuthHttpStatus: number | null = null;
  let supabaseRestHttpStatus: number | null = null;

  try {
    if (!supabaseUrl || !anonKey) throw new Error("public supabase env missing");
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey }
    });
    supabaseAuthHttpStatus = res.status;
    checks.supabase_auth = `http_${res.status}`;
  } catch (e) {
    checks.supabase_auth = `exception: ${e instanceof Error ? e.message : "unknown"}`;
  }

  try {
    if (!supabaseUrl || !anonKey) throw new Error("public supabase env missing");
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });
    supabaseRestHttpStatus = res.status;
    checks.supabase_rest = `http_${res.status}`;
  } catch (e) {
    checks.supabase_rest = `exception: ${e instanceof Error ? e.message : "unknown"}`;
  }

  if (isAdminCaller) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from("profiles")
        .select("id", { head: true, count: "exact" });
      checks.supabase_admin = error ? `error: ${error.message}` : "ok";
    } catch (e) {
      checks.supabase_admin = `exception: ${e instanceof Error ? e.message : "unknown"}`;
    }
  }

  const env = isAdminCaller ? { ...envPublic, ...envAdmin } : envPublic;

  const isSupabaseReachable =
    (supabaseAuthHttpStatus !== null && supabaseAuthHttpStatus >= 200 && supabaseAuthHttpStatus < 500) &&
    (supabaseRestHttpStatus !== null && supabaseRestHttpStatus >= 200 && supabaseRestHttpStatus < 500);

  return NextResponse.json({
    ok: Object.values(envPublic).every(Boolean),
    nodeEnv: process.env.NODE_ENV,
    isAdminCaller,
    env,
    checks,
    isSupabaseReachable,
    hint:
      "supabase_auth/supabase_rest が http_2xx〜4xx なら到達は正常です。4xx は認証/権限エラーで、ネットワーク断ではありません。"
  });
}
