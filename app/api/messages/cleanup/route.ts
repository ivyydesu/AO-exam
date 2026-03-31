import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    await requireUserFromBearerToken(req);
    getSupabaseAdmin();
    return NextResponse.json({ ok: true, mode: "disabled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cleanup messages";
    const status = message.includes("Authorization") || message.includes("Invalid user token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
