import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { buildLineLoginUrl } from "../../../../../lib/line";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    let returnTo = "";
    try {
      const body = await req.json();
      if (body?.returnTo === "/profile/settings" || body?.returnTo === "/settings") {
        returnTo = body.returnTo;
      }
    } catch {
      // bodyなしでも動作
    }

    const state = returnTo ? `${crypto.randomUUID()}::${returnTo}` : crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.from("line_link_states").insert({
      state,
      user_id: user.id,
      expires_at: expiresAt
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ authUrl: buildLineLoginUrl(state) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start LINE connection";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
