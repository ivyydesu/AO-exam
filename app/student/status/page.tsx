"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type RequestRow = {
  id: string;
  title: string;
  budget: number;
  status: string;
  requester_id: string;
  tutor_id: string | null;
  tutor_name: string | null;
  created_at: string;
};

const FLOW = ["draft", "accepted", "escrow_pending", "escrowed", "completed"] as const;
const LABELS: Record<string, string> = {
  draft: "申請作成",
  accepted: "先輩承認",
  escrow_pending: "Stripe画面",
  escrowed: "与信確保済み",
  completed: "完了",
  canceled: "キャンセル",
  rejected: "却下"
};

export default function StudentStatusPage() {
  const [userId, setUserId] = useState<string>("");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string>("");

  const load = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? "";
    setUserId(uid);
    if (!uid) return;
    const { data, error: loadError } = await supabase
      .from("requests_with_profile")
      .select("id, title, budget, status, requester_id, tutor_id, tutor_name, created_at")
      .eq("requester_id", uid)
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setRows((data as RequestRow[]) ?? []);
  };

  useEffect(() => {
    load();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("student-status-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        load();
      })
      .subscribe();

    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  const doCheckout = async (requestId: string) => {
    setLoadingId(requestId);
    setError("");
    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingId("");
    if (!res.ok) {
      setError(data.error ?? "Stripe与信開始に失敗");
      return;
    }
    window.location.href = data.url;
  };

  const doCapture = async (requestId: string) => {
    setLoadingId(requestId);
    setError("");
    const res = await fetch("/api/stripe/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingId("");
    if (!res.ok) {
      setError(data.error ?? "売上確定に失敗");
      return;
    }
    await load();
  };

  const doCancel = async (requestId: string) => {
    setLoadingId(requestId);
    setError("");
    const res = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingId("");
    if (!res.ok) {
      setError(data.error ?? "キャンセルに失敗");
      return;
    }
    await load();
  };

  const canShow = useMemo(() => Boolean(userId), [userId]);

  if (!canShow) return <p className="text-sea">ログイン確認中...</p>;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold text-sea">高校生 進捗確認</h2>
        <p className="text-sm text-sea/70 mt-1">依頼の進行状況を自動同期（4秒ごと更新）</p>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="grid gap-4">
        {rows.map((row) => {
          const idx = FLOW.indexOf(row.status as (typeof FLOW)[number]);
          return (
            <div className="card p-5 grid gap-3" key={row.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-sea">{row.title}</p>
                <span className="text-xs rounded-full bg-cloud px-3 py-1 text-sea">{LABELS[row.status] ?? row.status}</span>
              </div>
              <p className="text-sm text-sea/75">先輩: {row.tutor_name ?? "未割当"} / 予算: ¥{row.budget.toLocaleString()}</p>

              <div className="flex flex-wrap gap-2">
                {FLOW.map((step, i) => (
                  <span
                    key={step}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      idx >= i ? "bg-sea text-white border-sea" : "bg-white text-sea/60 border-sand"
                    }`}
                  >
                    {LABELS[step]}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link className="btn btn-secondary" href={`/student/status/${row.id}`}>
                  詳細
                </Link>
                {row.status === "accepted" && (
                  <button className="btn btn-primary" onClick={() => doCheckout(row.id)} disabled={loadingId === row.id}>
                    Stripe与信テスト
                  </button>
                )}
                {row.status === "escrowed" && (
                  <button className="btn btn-secondary" onClick={() => doCapture(row.id)} disabled={loadingId === row.id}>
                    売上確定テスト
                  </button>
                )}
                {["accepted", "escrow_pending", "escrowed"].includes(row.status) && (
                  <button className="btn border border-sea text-sea" onClick={() => doCancel(row.id)} disabled={loadingId === row.id}>
                    キャンセルテスト
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
