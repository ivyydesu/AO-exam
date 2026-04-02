import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (error && !String(error.message || "").includes("onboarding_completed")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ completed: Boolean(data?.onboarding_completed) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const completed = Boolean(body?.completed);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ onboarding_completed: completed })
      .eq("id", user.id);

    if (error && String(error.message || "").includes("onboarding_completed")) {
      return NextResponse.json(
        {
          error: "profiles.onboarding_completed カラムが未作成です。Supabase SQL を反映してください。"
        },
        { status: 500 }
      );
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, completed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unauthorized" }, { status: 401 });
  }
}
