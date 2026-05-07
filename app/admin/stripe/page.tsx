"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";

export default function AdminStripeFeePage() {
  const [percent, setPercent] = useState(30);
  const [stripeMode, setStripeMode] = useState<"live" | "test">("test");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeader = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client is not initialized");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("ログインが必要です");
    return { Authorization: `Bearer ${data.session.access_token}` };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/stripe/fee", { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "読み込みに失敗しました");
      setPercent(Number(payload.percent ?? 30));
      setStripeMode(payload.stripeMode === "live" ? "live" : "test");
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/stripe/fee", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ percent })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "保存に失敗しました");
      setPercent(Number(payload.percent ?? percent));
      setNotice("手数料設定を保存しました。以後の決済から反映されます。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#111827]">Stripe 手数料設定</h1>
        <p className="mt-2 text-sm text-[#6B7280]">運営取り分(%)を設定します。0〜95 の整数で入力してください。</p>
        <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stripeMode === "live" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          Stripeモード: {stripeMode === "live" ? "本番 (Live)" : "テスト (Test)"}
        </p>
        {stripeMode !== "live" ? (
          <p className="mt-2 text-xs text-amber-700">
            本番反映するには Vercel の環境変数 `STRIPE_SECRET_KEY` をライブ用シークレットキーに変更し、再デプロイしてください。
          </p>
        ) : null}

        {loading ? <p className="mt-6 text-sm text-[#6B7280]">読み込み中...</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p> : null}

        {!loading ? (
          <div className="mt-6 flex max-w-sm items-end gap-3">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-semibold text-[#111827]">PLATFORM_FEE_PERCENT</span>
              <input
                type="number"
                min={0}
                max={95}
                step={1}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0ea371] disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        ) : null}

        <p className="mt-6 text-xs text-[#6B7280]">
          注: 既に作成済みの PaymentIntent には適用されません。保存後に新規作成される決済から反映されます。
        </p>
      </div>
    </div>
  );
}
