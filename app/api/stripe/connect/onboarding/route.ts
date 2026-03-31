import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { stripe } from "../../../../../lib/stripe";

function getBaseUrl(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    if (meError || !me) {
      return NextResponse.json({ error: "プロフィール取得に失敗しました" }, { status: 400 });
    }

    if (me.role !== "tutor" && me.role !== "admin") {
      return NextResponse.json({ error: "大学生アカウントのみ利用できます" }, { status: 403 });
    }

    let accountId = me.stripe_account_id ?? null;
    if (!accountId) {
      const created = await stripe.accounts.create({
        type: "express",
        country: "JP",
        email: user.email || undefined,
        business_type: "individual",
        business_profile: {
          product_description: "ユニブリ mentor service"
        },
        metadata: {
          ao_match_user_id: user.id,
          ao_match_role: me.role
        }
      });
      accountId = created.id;
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (updateError) {
        return NextResponse.json({ error: "Stripe口座IDの保存に失敗しました" }, { status: 500 });
      }
    }

    const baseUrl = getBaseUrl(req);
    const returnUrl = `${baseUrl}/profile/settings?tab=profile&stripe=connected`;
    const refreshUrl = `${baseUrl}/profile/settings?tab=profile&stripe=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl
    });

    return NextResponse.json({
      ok: true,
      accountId,
      onboardingUrl: accountLink.url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "口座登録リンクの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

