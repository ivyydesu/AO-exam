import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { exchangeLineCodeForProfile } from "../../../../../lib/line";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const code = search.get("code");
  const state = search.get("state");
  const pathFromState = state?.includes("::/profile/settings") ? "/profile/settings" : "/settings";

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${pathFromState}?line=error_missing_params`, req.url));
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: stateRow, error: stateError } = await supabaseAdmin
    .from("line_link_states")
    .select("state, user_id, expires_at")
    .eq("state", state)
    .single();

  if (stateError || !stateRow) {
    return NextResponse.redirect(new URL(`${pathFromState}?line=error_invalid_state`, req.url));
  }

  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("line_link_states").delete().eq("state", state);
    const path = state.includes("::/profile/settings") ? "/profile/settings" : "/settings";
    return NextResponse.redirect(new URL(`${path}?line=error_state_expired`, req.url));
  }

  const returnPath = stateRow.state.includes("::/profile/settings") ? "/profile/settings" : "/settings";

  try {
    const lineProfile = await exchangeLineCodeForProfile(code);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ line_user_id: lineProfile.lineUserId })
      .eq("id", stateRow.user_id);

    await supabaseAdmin.from("line_link_states").delete().eq("state", state);

    if (updateError) {
      return NextResponse.redirect(new URL(`${returnPath}?line=error_save_failed`, req.url));
    }

    return NextResponse.redirect(new URL(`${returnPath}?line=connected`, req.url));
  } catch {
    await supabaseAdmin.from("line_link_states").delete().eq("state", state);
    return NextResponse.redirect(new URL(`${returnPath}?line=error_exchange_failed`, req.url));
  }
}
