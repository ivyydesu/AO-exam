import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { exchangeLineCodeForProfile } from "../../../../../lib/line";

function withLineParam(path: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}line=${encodeURIComponent(value)}`;
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const code = search.get("code");
  const state = search.get("state");
  const defaultReturnPath = "/profile/settings?tab=notifications";
  const pathFromState = state?.includes("::/profile/settings")
    ? state.split("::")[1] || defaultReturnPath
    : defaultReturnPath;

  if (!code || !state) {
    return NextResponse.redirect(new URL(withLineParam(pathFromState, "error_missing_params"), req.url));
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: stateRow, error: stateError } = await supabaseAdmin
    .from("line_link_states")
    .select("state, user_id, expires_at")
    .eq("state", state)
    .single();

  if (stateError || !stateRow) {
    return NextResponse.redirect(new URL(withLineParam(pathFromState, "error_invalid_state"), req.url));
  }

  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("line_link_states").delete().eq("state", state);
    const path = state.includes("::/profile/settings")
      ? state.split("::")[1] || defaultReturnPath
      : defaultReturnPath;
    return NextResponse.redirect(new URL(withLineParam(path, "error_state_expired"), req.url));
  }

  const returnPath = stateRow.state.includes("::/profile/settings")
    ? stateRow.state.split("::")[1] || defaultReturnPath
    : defaultReturnPath;

  try {
    const lineProfile = await exchangeLineCodeForProfile(code);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ line_user_id: lineProfile.lineUserId })
      .eq("id", stateRow.user_id);

    await supabaseAdmin.from("line_link_states").delete().eq("state", state);

    if (updateError) {
      return NextResponse.redirect(new URL(withLineParam(returnPath, "error_save_failed"), req.url));
    }

    return NextResponse.redirect(new URL(withLineParam(returnPath, "connected"), req.url));
  } catch {
    await supabaseAdmin.from("line_link_states").delete().eq("state", state);
    return NextResponse.redirect(new URL(withLineParam(returnPath, "error_exchange_failed"), req.url));
  }
}
