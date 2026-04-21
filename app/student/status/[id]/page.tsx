"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../../lib/supabase/client";

type RequestRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  requester_id: string;
  tutor_name: string | null;
};

const STEPS = ["依頼", "依頼確認中", "支払い待ち", "支払い完了", "相談実施中", "評価待ち", "完了"] as const;

function stepIndex(status: string, hasReview: boolean) {
  if (status === "draft") return 1;
  if (status === "accepted" || status === "escrow_pending") return 2;
  if (status === "escrowed") return 4;
  if (status === "completed") return hasReview ? 6 : 5;
  return 0;
}

export default function StudentRequestStatusPage() {
  const params = useParams();
  const requestId = params.id as string;
  const [item, setItem] = useState<RequestRow | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [hasReview, setHasReview] = useState(false);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const load = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? "";
    setUserId(uid);
    if (!uid) return;

    const { data, error: reqError } = await supabase
      .from("requests_with_profile")
      .select("id, title, description, status, budget, requester_id, tutor_name")
      .eq("id", requestId)
      .maybeSingle();
    if (reqError) {
      setError(reqError.message);
      return;
    }
    setItem((data as RequestRow | null) ?? null);

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id")
      .eq("request_id", requestId)
      .limit(1);
    setHasReview((reviewData?.length ?? 0) > 0);
  };

  useEffect(() => {
    load();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`student-request-${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `id=eq.${requestId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `request_id=eq.${requestId}` },
        () => load()
      )
      .subscribe();

    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const current = useMemo(() => stepIndex(item?.status ?? "draft", hasReview), [item?.status, hasReview]);

  const startCheckout = async () => {
    setLoadingAction("checkout");
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
      if (!res.ok) throw new Error(data.error ?? "支払い開始に失敗");

      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to start checkout", error);
      setError(error instanceof Error ? error.message : "支払い開始に失敗");
    } finally {
      setLoadingAction("");
    }
  };

  const completeAndCapture = async () => {
    setLoadingAction("capture");
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
      setLoadingAction("");
    }
  };

  if (!userId) return <p className="text-sea">ログイン確認中...</p>;
  if (!item) return <p className="text-sea">申請が見つかりません。</p>;
  if (item.requester_id !== userId) return <p className="text-accent">この申請を閲覧する権限がありません。</p>;

  const terminal = item.status === "canceled" || item.status === "rejected";

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold text-sea">申請状況</h2>
        <p className="mt-1 text-sm text-sea/70">{item.title}</p>
        <p className="mt-1 text-sm text-sea/70">担当先輩: {item.tutor_name ?? "未割当"} / 予算: ¥{item.budget.toLocaleString()}</p>
        {terminal && (
          <p className="mt-3 text-sm text-accent">
            現在ステータス: {item.status === "canceled" ? "キャンセル" : "却下"}
          </p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((step, idx) => (
            <span
              key={step}
              className={`text-xs px-3 py-1 rounded-full border ${
                !terminal && idx <= current ? "bg-sea text-white border-sea" : "bg-white text-sea/65 border-sand"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="card p-6 flex flex-wrap gap-2">
        <Link className="btn btn-secondary" href="/student/status">
          一覧へ戻る
        </Link>
        <Link className="btn btn-secondary" href={`/requests/${requestId}`}>
          詳細ページ
        </Link>
        {item.status === "accepted" && (
          <button className="btn btn-primary" onClick={startCheckout} disabled={loadingAction !== ""}>
            {loadingAction === "checkout" ? "遷移中..." : "支払いへ進む"}
          </button>
        )}
        {item.status === "escrowed" && (
          <>
            <Link className="btn btn-secondary" href={`/chat/${requestId}`}>
              チャットを開く
            </Link>
            <button className="btn btn-primary" onClick={completeAndCapture} disabled={loadingAction !== ""}>
              {loadingAction === "capture" ? "処理中..." : "相談完了（評価へ進む）"}
            </button>
          </>
        )}
        {item.status === "completed" && !hasReview && (
          <Link className="btn btn-primary" href={`/requests/${requestId}`}>
            評価する
          </Link>
        )}
      </div>
    </div>
  );
}
