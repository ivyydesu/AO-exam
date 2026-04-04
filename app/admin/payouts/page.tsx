"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type StripeMode = "live" | "test";

export default function AdminPayoutsPage() {
  const [stripeMode, setStripeMode] = useState<StripeMode>("test");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dashboardUrl = useMemo(() => {
    return stripeMode === "live" ? "https://dashboard.stripe.com/settings/payouts" : "https://dashboard.stripe.com/test/settings/payouts";
  }, [stripeMode]);

  useEffect(() => {
    const loadMode = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase client is not initialized");
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("ログインが必要です");

        const res = await fetch("/api/admin/stripe/fee", {
          headers: { Authorization: `Bearer ${data.session.access_token}` }
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error ?? "Stripe設定の取得に失敗しました");
        setStripeMode(payload?.stripeMode === "live" ? "live" : "test");
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void loadMode();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#111827]">会社の振込先口座設定</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          UniBridge運営の受取口座は、Stripeダッシュボード側で設定します。ここで現在モードを確認して、正しいStripe画面へ移動できます。
        </p>

        <div className="mt-5">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              stripeMode === "live" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            Stripeモード: {stripeMode === "live" ? "本番 (Live)" : "テスト (Test)"}
          </span>
        </div>

        {loading ? <p className="mt-4 text-sm text-[#6B7280]">確認中...</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 space-y-3">
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0ea371]"
          >
            Stripeで会社口座を設定する
          </a>
          <p className="text-xs text-[#6B7280]">
            入金先口座設定は「Stripe Dashboard → Settings → Payouts」で行います。Stripe側で設定後、即時または次回入金から反映されます。
          </p>
        </div>

        {stripeMode !== "live" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            現在はテストモードです。本番利用するには Vercel の環境変数 `STRIPE_SECRET_KEY` を `sk_live_...` に変更して再デプロイしてください。
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            本番モードです。ここで設定した会社口座に、運営手数料がStripe経由で入金されます。
          </div>
        )}

        <div className="mt-8">
          <Link href="/admin" className="text-sm font-semibold text-[#10B981] hover:underline">
            ← 管理トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

