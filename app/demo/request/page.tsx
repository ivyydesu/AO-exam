"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type RequestRow = {
  id: string;
  title: string;
  status: string;
  budget: number;
  requester_name: string | null;
  tutor_id: string | null;
  created_at: string;
};

const STEPS = ["依頼", "確認中", "支払い待ち", "支払い完了", "相談実施中", "評価待ち", "完了"] as const;

function ToolLink({ href, label, icon, active = false }: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center rounded-lg p-3 transition-colors ${active ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#10B981]"}`}>
      <span className="text-[22px]">{icon}</span>
      <span className="ml-3 hidden lg:block">{label}</span>
    </Link>
  );
}

function stepIndex(status: string) {
  if (status === "draft") return 0;
  if (status === "accepted" || status === "escrow_pending") return 2;
  if (status === "escrowed") return 4;
  if (status === "completed") return 6;
  return 0;
}

function statusChip(status: string) {
  if (status === "rejected" || status === "canceled") {
    return "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wide";
  }
  if (status === "escrowed") {
    return "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-wide";
  }
  if (status === "accepted" || status === "escrow_pending") {
    return "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide";
  }
  return "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide";
}

function statusLabel(status: string) {
  if (status === "draft") return "Pending";
  if (status === "accepted" || status === "escrow_pending") return "Waiting Payment";
  if (status === "escrowed") return "In Session";
  if (status === "completed") return "Completed";
  if (status === "rejected") return "Rejected";
  if (status === "canceled") return "Canceled";
  return status;
}

export default function DemoRequestPage() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<RequestRow[]>([]);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState("");

  const load = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? "";
    setUserId(uid);
    if (!uid) return;

    const { data, error: loadError } = await supabase
      .from("requests_with_profile")
      .select("id, title, status, budget, requester_name, tutor_id, created_at")
      .or(`tutor_id.eq.${uid},tutor_id.is.null`)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }
    setItems((data as RequestRow[]) ?? []);
  };

  useEffect(() => {
    load();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel("demo-tutor-requests-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const decide = async (requestId: string, action: "approve" | "reject") => {
    if (!userId) return;
    setLoadingId(requestId);
    setError("");
    const res = await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorId: userId, action })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingId("");
    if (!res.ok) {
      setError(data.error ?? "更新に失敗しました");
      return;
    }
    load();
  };

  const stats = useMemo(() => {
    const pending = items.filter((x) => x.status === "draft").length;
    const waiting = items.filter((x) => x.status === "accepted" || x.status === "escrow_pending").length;
    const active = items.filter((x) => x.status === "escrowed").length;
    return { pending, waiting, active };
  }, [items]);

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#F9FAFB] text-slate-800">
      <div className="flex min-h-[calc(100dvh-81px)] overflow-hidden">
        <aside className="w-20 shrink-0 border-r border-[#E5E7EB] bg-white/98 lg:w-64">
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-8">
              <ToolLink href="/calendar" label="スケジュール" icon="📅" />
              <ToolLink href="/chat" label="メッセージ" icon="💬" />
              <ToolLink href="/demo/request" label="申請状況" icon="📋" active />
            </nav>
          </div>
        </aside>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#00B884]">Tutor Transactions</p>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">大学生 取引管理</h1>
          <p className="text-sm font-medium text-slate-500">高校生の申請状況ページとリアルタイム同期</p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">承認待ち</h3>
              <div className="rounded-lg bg-emerald-50 p-2 text-[20px] text-emerald-500">⏳</div>
            </div>
            <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-slate-900">{stats.pending}</span><span className="ml-1 text-xs text-slate-400">件</span></div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">支払い待ち</h3>
              <div className="rounded-lg bg-blue-50 p-2 text-[20px] text-blue-500">💳</div>
            </div>
            <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-slate-900">{stats.waiting}</span><span className="ml-1 text-xs text-slate-400">件</span></div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">相談実施中</h3>
              <div className="rounded-lg bg-purple-50 p-2 text-[20px] text-purple-500">💬</div>
            </div>
            <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-slate-900">{stats.active}</span><span className="ml-1 text-xs text-slate-400">件</span></div>
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

        <div className="space-y-8">
          {items.map((item) => {
            const activeIdx = stepIndex(item.status);
            return (
              <div key={item.id} className="rounded-xl border border-[#E0E0E0] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
                <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900">{item.title || "AO相談: 大学のことをざっくばらんに教えてほしい"}</h2>
                      <span className={statusChip(item.status)}>{statusLabel(item.status)}</span>
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="rounded bg-slate-50 p-1 text-slate-400">👤</div>
                        <div className="flex flex-col">
                          <span className="mb-0.5 text-[10px] font-medium uppercase leading-none tracking-wide text-slate-400">依頼者</span>
                          <span className="text-xs font-medium text-slate-700">{item.requester_name ?? "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded bg-slate-50 p-1 text-slate-400">¥</div>
                        <div className="flex flex-col">
                          <span className="mb-0.5 text-[10px] font-medium uppercase leading-none tracking-wide text-slate-400">予算</span>
                          <span className="text-xs font-semibold text-slate-900">¥{item.budget.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/requests/${item.id}`}
                      className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                    >
                      <span>詳細</span>
                      <span className="text-[16px] transition-transform group-hover:translate-x-0.5">→</span>
                    </Link>

                    {item.status === "draft" ? (
                      <button
                        className="rounded-lg border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        onClick={() => decide(item.id, "approve")}
                        disabled={loadingId === item.id}
                      >
                        承認
                      </button>
                    ) : null}

                    {["draft", "accepted"].includes(item.status) ? (
                      <button
                        className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        onClick={() => decide(item.id, "reject")}
                        disabled={loadingId === item.id}
                      >
                        却下
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="pb-2 pt-2">
                  <div className="relative w-full">
                    <div className="absolute left-0 top-[7px] z-0 h-[1px] w-full bg-gray-200" />
                    <div className="relative z-10 flex w-full justify-between">
                      {STEPS.map((step, idx) => {
                        const active = idx <= activeIdx;
                        return (
                          <div key={`${item.id}-${step}`} className={`flex w-8 flex-col items-center ${idx === 0 ? "-ml-4" : ""} ${idx === STEPS.length - 1 ? "-mr-4 items-end" : ""}`}>
                            <div
                              className={`box-content rounded-full border-2 border-white ${
                                active
                                  ? idx === 0
                                    ? "h-3.5 w-3.5 bg-[#00B884] shadow-sm"
                                    : "h-2.5 w-2.5 bg-[#00B884]"
                                  : "h-2.5 w-2.5 bg-gray-200"
                              }`}
                            />
                            <span className={`absolute top-6 w-20 whitespace-nowrap text-center text-[10px] ${active ? "font-semibold text-[#00B884]" : "text-gray-400"}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="rounded-xl border border-[#E0E0E0] bg-white p-8 text-sm text-slate-500">
              表示できる申請はありません。
            </div>
          ) : null}
        </div>
        </main>
      </div>
    </div>
  );
}
