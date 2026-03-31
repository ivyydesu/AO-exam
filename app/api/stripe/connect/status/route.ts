import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { stripe } from "../../../../../lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    if (meError || !me) {
      return NextResponse.json({ error: "プロフィール取得に失敗しました" }, { status: 400 });
    }

    if (me.role !== "tutor" && me.role !== "admin") {
      return NextResponse.json({ error: "大学生アカウントのみ利用できます" }, { status: 403 });
    }

    if (!me.stripe_account_id) {
      return NextResponse.json({
        ok: true,
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false
      });
    }

    const account = await stripe.accounts.retrieve(me.stripe_account_id);
    return NextResponse.json({
      ok: true,
      connected: true,
      accountId: account.id,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "口座状態の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

