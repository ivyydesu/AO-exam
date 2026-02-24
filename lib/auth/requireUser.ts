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

  return data.user;
}
