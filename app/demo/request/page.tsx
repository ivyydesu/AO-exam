"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";
import DemoTopNav from "../../../components/DemoTopNav";

type RequestRow = {
  id: string;
  title: string;
  status: string;
  budget: number;
  requester_name: string | null;
  tutor_id: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "依頼確認中",
  accepted: "支払い待ち",
  escrow_pending: "支払い処理中",
  escrowed: "相談実施中",
  completed: "評価待ち/完了",
  canceled: "キャンセル",
  rejected: "却下"
};

const STEPS = ["依頼", "依頼確認中", "支払い待ち", "支払い完了", "相談実施中", "評価待ち", "完了"] as const;

function stepIndex(status: string) {
  if (status === "draft") return 1;
  if (status === "accepted" || status === "escrow_pending") return 2;
  if (status === "escrowed") return 4;
  if (status === "completed") return 6;
  return 0;
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
      .channel("demo-tutor-requests")
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
    await load();
  };

  const stats = useMemo(() => {
    const pending = items.filter((x) => x.status === "draft").length;
    const waitingPayment = items.filter((x) => x.status === "accepted" || x.status === "escrow_pending").length;
    const active = items.filter((x) => x.status === "escrowed").length;
    return { pending, waitingPayment, active };
  }, [items]);

  return (
    <div className="grid gap-6">
      <DemoTopNav active="status" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">Tutor Transactions</p>
          <h1 className="text-3xl font-display font-semibold text-ink">大学生 取引管理</h1>
          <p className="text-sm text-sea/70 mt-1">高校生の申請状況ページとリアルタイム同期</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-sea/60">承認待ち</p>
          <p className="text-2xl font-semibold text-sea">{stats.pending}件</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-sea/60">支払い待ち</p>
          <p className="text-2xl font-semibold text-sea">{stats.waitingPayment}件</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-sea/60">相談実施中</p>
          <p className="text-2xl font-semibold text-sea">{stats.active}件</p>
        </div>
      </section>

      {error && <p className="text-sm text-accent">{error}</p>}

      <section className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="card p-5 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-sea">{item.title}</p>
              <span className="text-xs rounded-full bg-cloud px-3 py-1 text-sea">
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
            </div>
            <p className="text-sm text-sea/75">依頼者: {item.requester_name ?? "-"} / 予算: ¥{item.budget.toLocaleString()}</p>
            <p className="text-xs text-sea/60">{item.tutor_id ? "あなたに割当済み" : "未割当（承認で担当化）"}</p>
            <div className="flex flex-wrap gap-1">
              {STEPS.map((step, idx) => (
                <span
                  key={`${item.id}-${step}`}
                  className={`text-[11px] px-2 py-1 rounded-full border ${
                    idx <= stepIndex(item.status) ? "bg-sea text-white border-sea" : "bg-white text-sea/65 border-sand"
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-secondary" href={`/requests/${item.id}`}>
                詳細
              </Link>
              {item.status === "draft" && (
                <button className="btn btn-primary" onClick={() => decide(item.id, "approve")} disabled={loadingId === item.id}>
                  承認
                </button>
              )}
              {["draft", "accepted"].includes(item.status) && (
                <button className="btn border border-sea text-sea" onClick={() => decide(item.id, "reject")} disabled={loadingId === item.id}>
                  却下
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-sea/70">表示できる申請はありません。</p>}
      </section>
    </div>
  );
}
