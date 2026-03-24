"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

type SuspensionState = {
  blocked: boolean;
  remainingHours: number | null;
  until: string | null;
  reason: string | null;
};

function calcRemainingHours(until: string | null) {
  if (!until) return null;
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60)));
}

export default function AccountSuspensionOverlay() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [state, setState] = useState<SuspensionState>({
    blocked: false,
    remainingHours: null,
    until: null,
    reason: null
  });

  const isAuthPage = pathname.startsWith("/auth/");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (isAuthPage) {
        if (mounted) {
          setState({ blocked: false, remainingHours: null, until: null, reason: null });
        }
        return;
      }
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!mounted || !user) {
        setState({ blocked: false, remainingHours: null, until: null, reason: null });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_suspended, suspended_until, suspended_reason")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted || !data) return;
      const isSuspended = Boolean(data.is_suspended);
      const remainingHours = calcRemainingHours(data.suspended_until ?? null);
      const stillActive = isSuspended && (data.suspended_until == null || (remainingHours ?? 0) > 0);

      setState({
        blocked: stillActive,
        remainingHours: remainingHours,
        until: data.suspended_until ?? null,
        reason: data.suspended_reason ?? null
      });
    };

    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [isAuthPage, pathname]);

  const text = useMemo(() => {
    if (!state.blocked) return "";
    if (state.remainingHours == null) return "無期限で利用停止されています";
    if (state.remainingHours <= 0) return "利用停止されています";
    return `${state.remainingHours}時間利用停止されています`;
  }, [state.blocked, state.remainingHours]);

  if (!state.blocked || isAuthPage) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-3xl rounded-3xl border border-red-200 bg-white p-10 text-center shadow-2xl">
        <p className="text-4xl font-extrabold tracking-tight text-red-600 md:text-5xl">{text}</p>
        {state.reason ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-2xl bg-red-50 px-5 py-4 text-lg font-semibold text-red-700">
            停止理由: {state.reason}
          </p>
        ) : null}
        <p className="mt-6 text-sm text-gray-500">
          不明点がある場合は運営までお問い合わせください。
          {state.until ? `（停止期限: ${new Date(state.until).toLocaleString("ja-JP")}）` : ""}
        </p>
        <button
          type="button"
          className="mt-8 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          onClick={async () => {
            const supabase = getSupabaseClient();
            await supabase?.auth.signOut();
            router.replace("/auth/login");
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

