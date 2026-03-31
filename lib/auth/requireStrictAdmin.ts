import { NextRequest } from "next/server";
import { isAllowedAdminEmail } from "./adminAllowlist";
import { requireUserFromBearerToken } from "./requireUser";
import { getSupabaseAdmin } from "../supabase/server";

export async function requireStrictAdminFromBearer(req: NextRequest) {
  const user = await requireUserFromBearerToken(req);
  if (!isAllowedAdminEmail(user.email)) {
    throw new Error("Admin email not allowed");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: me, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !me || me.role !== "admin") {
    throw new Error("Admin only");
  }

  return { user, supabaseAdmin };
}
