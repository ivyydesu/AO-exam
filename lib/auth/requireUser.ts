import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "../supabase/server";

export async function requireUserFromBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new Error("Missing Authorization Bearer token");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Invalid user token");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, is_suspended, suspended_until")
    .eq("id", data.user.id)
    .maybeSingle();

  if (
    !profileError &&
    profile &&
    profile.is_suspended &&
    (!profile.suspended_until || new Date(profile.suspended_until).getTime() > Date.now())
  ) {
    throw new Error("Account suspended");
  }

  return data.user;
}
