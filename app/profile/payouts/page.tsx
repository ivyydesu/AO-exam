"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";

type StripeConnectState = {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

const normalizeRole = (value: unknown) => String(value ?? "").trim().toLowerCase();

export default function PayoutSettingsPage() {
  const [state, setState] = useState<StripeConnectState>({
    connected: false,
    accountId: null,
    chargesEnabled: false,
    payoutsEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeader = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client is not initialized");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("ログインが必要です");
    return { Authorization: `Bearer ${data.session.access_token}` };
  };

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) throw new Error("ログインが必要です");
      const sessionRole =
        normalizeRole(sessionData.session.user.user_metadata?.role) ||
        normalizeRole(sessionData.session.user.app_metadata?.role);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      const profileRole = normalizeRole(profile?.role);
      const resolvedRole = profileRole || sessionRole;
      if (!resolvedRole) {
        console.warn("Payout setup role resolution failed: role is missing from profile and session", {
          userId: uid,
          profileRole: profile?.role ?? null,
          sessionRole: sessionData.session.user.user_metadata?.role ?? sessionData.session.user.app_metadata?.role ?? null
        });
        throw new Error("データの読み込みに失敗しました");
      }
      const isTutor = resolvedRole === "tutor";
      setAllowed(isTutor);
      if (!isTutor) {
        console.warn("Payout setup access blocked: non-tutor role", {
          userId: uid,
          profileRole: profile?.role ?? null,
          sessionRole: sessionData.session.user.user_metadata?.role ?? sessionData.session.user.app_metadata?.role ?? null,
          resolvedRole
        });
        setError("このページは大学生メンターアカウントのみ利用できます。");
        return;
      }
      const res = await fetch("/api/stripe/connect/status", { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "口座状態の取得に失敗しました");
      setState({
        connected: Boolean(payload.connected),
        accountId: payload.accountId ?? null,
        chargesEnabled: Boolean(payload.chargesEnabled),
        payoutsEnabled: Boolean(payload.payoutsEnabled)
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "口座状態の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const startOnboarding = async () => {
    setConnecting(true);
    setError(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/stripe/connect/onboarding", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.onboardingUrl) throw new Error(payload.error ?? "口座登録リンクの作成に失敗しました");
      window.location.href = payload.onboardingUrl as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "口座登録リンクの作成に失敗しました");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <p className="text-sm text-[#6B7280]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (allowed !== true) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          {error ? <p className="text-sm text-red-700">{error}</p> : <p className="text-sm text-[#6B7280]">データの読み込みに失敗しました</p>}
          <div className="mt-4">
            <Link href="/profile/settings?tab=manage" className="text-sm font-semibold text-[#10B981] hover:underline">
              設定画面へ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#111827]">振込先口座設定</h1>
        <p className="mt-2 text-sm text-[#6B7280]">大学生メンター向けの Stripe Connect 口座設定ページです。</p>

        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p> : null}

        <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <p className="text-sm">
            接続状態:{" "}
            <span className={state.connected ? "font-semibold text-[#059669]" : "font-semibold text-[#B45309]"}>
              {state.connected ? "接続済み" : "未接続"}
            </span>
          </p>
          {state.accountId ? <p className="mt-1 text-xs text-[#6B7280]">Account ID: {state.accountId}</p> : null}
          <p className="mt-2 text-sm text-[#374151]">決済受取: {state.chargesEnabled ? "有効" : "未完了"} / 振込: {state.payoutsEnabled ? "有効" : "未完了"}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startOnboarding}
              disabled={connecting}
              className="rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0ea371] disabled:opacity-60"
            >
              {connecting ? "起動中..." : state.connected ? "口座情報を更新" : "口座登録を開始"}
            </button>
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="rounded-xl border border-[#D1D5DB] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-white"
            >
              状態を再確認
            </button>
            <Link href="/profile/settings?tab=profile" className="rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-[#6B7280] hover:border-[#D1D5DB]">
              プロフィール設定へ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
