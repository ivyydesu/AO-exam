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

function ToolLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="flex items-center rounded-lg p-3 text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#10B981]">
      <span className="text-[22px]">{icon}</span>
      <span className="ml-3 hidden lg:block">{label}</span>
    </Link>
  );
}

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
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Stripe与信開始に失敗");

      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to start checkout", error);
      setError(error instanceof Error ? error.message : "Stripe与信開始に失敗");
    } finally {
      setLoadingId("");
    }
  };

  const doCapture = async (requestId: string) => {
    setLoadingId(requestId);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");

      const res = await fetch("/api/stripe/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "売上確定に失敗");

      await load();
    } catch (error) {
      console.error("Failed to capture payment", error);
      setError(error instanceof Error ? error.message : "売上確定に失敗");
    } finally {
      setLoadingId("");
    }
  };

  const doCancel = async (requestId: string) => {
    setLoadingId(requestId);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");

      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "キャンセルに失敗");

      await load();
    } catch (error) {
      console.error("Failed to cancel request", error);
      setError(error instanceof Error ? error.message : "キャンセルに失敗");
    } finally {
      setLoadingId("");
    }
  };

  const canShow = useMemo(() => Boolean(userId), [userId]);

  if (!canShow) return <p className="text-sea">ログイン確認中...</p>;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="flex min-h-[calc(100dvh-81px)] overflow-hidden bg-[#F9FAFB] text-[#111827]">
        <aside className="w-20 shrink-0 border-r border-[#E5E7EB] bg-white/98 lg:w-64">
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-8">
              <ToolLink href="/calendar" label="スケジュール" icon="📅" />
              <ToolLink href="/chat" label="メッセージ" icon="💬" />
              <ToolLink href="/demo/request" label="申請状況" icon="📋" />
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-[#F9FAFB]/90 px-8 py-4 backdrop-blur-md">
            <h1 className="text-3xl font-bold tracking-tight text-[#111827] md:text-4xl">申請状況の確認</h1>
            <p className="mt-1 text-sm text-[#6B7280]">依頼の進行状況を一覧で確認できます。</p>
          </header>

          <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

            <section className="mb-6 rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#10B981]">Flow Guide</div>
                  <h2 className="mt-2 text-xl font-bold text-[#111827]">今どこまで進んでいるかを、この画面で確認できます</h2>
                  <p className="mt-2 text-sm leading-7 text-[#6B7280]">
                    依頼を送ったあと、先輩の確認・支払い・相談開始・完了までを順番に表示します。今必要な行動がある場合だけ、ボタンが表示されます。
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[#374151] shadow-sm">
                  <div className="font-semibold text-[#111827]">見るポイント</div>
                  <div className="mt-2 space-y-1">
                    <div>・先輩が承認したか</div>
                    <div>・支払いが必要か</div>
                    <div>・相談開始できる状態か</div>
                  </div>
                </div>
              </div>
            </section>

            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              {rows.length === 0 ? (
                <div className="px-8 py-10 text-sm text-[#6B7280]">まだ申請はありません。</div>
              ) : (
                rows.map((row) => {
                  const idx = FLOW.indexOf(row.status as (typeof FLOW)[number]);
                  return (
                    <div key={row.id} className="border-b border-[#E5E7EB] px-8 py-6 last:border-b-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-[#111827]">{row.title}</p>
                          <p className="mt-1 text-sm text-[#6B7280]">先輩: {row.tutor_name ?? "未割当"} / 予算: ¥{row.budget.toLocaleString()}</p>
                        </div>
                        <span className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#374151]">{LABELS[row.status] ?? row.status}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {FLOW.map((step, i) => (
                          <span key={step} className={`rounded-full border px-2 py-1 text-xs ${idx >= i ? "border-[#10B981] bg-[#10B981] text-white" : "border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
                            {LABELS[step]}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
                        {row.status === "draft" && "申請を送信済みです。今は先輩の確認を待っています。"}
                        {(row.status === "accepted" || row.status === "escrow_pending") && "先輩が承認しました。次は支払い手続きを進めてください。"}
                        {row.status === "escrowed" && "支払い完了済みです。専用チャットや通話導線から相談を開始できます。"}
                        {row.status === "completed" && "この相談は完了しています。必要ならレビューや振り返りを行ってください。"}
                        {row.status === "rejected" && "今回は承認されませんでした。必要なら別の先輩に再申請してみましょう。"}
                        {row.status === "canceled" && "この依頼はキャンセルされています。"}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]" href={`/student/status/${row.id}`}>詳細</Link>
                        {row.status === "accepted" && (
                          <button className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-60" onClick={() => doCheckout(row.id)} disabled={loadingId === row.id}>Stripe与信テスト</button>
                        )}
                        {row.status === "escrowed" && (
                          <button className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60" onClick={() => doCapture(row.id)} disabled={loadingId === row.id}>売上確定テスト</button>
                        )}
                        {["accepted", "escrow_pending", "escrowed"].includes(row.status) && (
                          <button className="rounded-lg border border-[#FCA5A5] px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-red-50 disabled:opacity-60" onClick={() => doCancel(row.id)} disabled={loadingId === row.id}>キャンセルテスト</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <p className="mt-8 text-center text-xs text-[#6B7280]/70">© 2024 ユニブリ. All rights reserved.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
