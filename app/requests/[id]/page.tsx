"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

interface RequestDetail {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  requester_id: string;
  tutor_id: string | null;
  requester_name: string | null;
  tutor_name: string | null;
  stripe_payment_intent_id: string | null;
}

interface RequestFormDetail {
  support_topic: string;
  support_method: string;
  estimated_duration: string;
  requested_deadline: string | null;
  suggested_price: number;
  requested_price: number;
}

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [formDetail, setFormDetail] = useState<RequestFormDetail | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<"student" | "tutor" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);

  const refresh = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from("requests_with_profile").select("*").eq("id", requestId).single();
    setRequest(data as RequestDetail);
    const { data: detail } = await supabase
      .from("request_details")
      .select("support_topic, support_method, estimated_duration, requested_deadline, suggested_price, requested_price")
      .eq("request_id", requestId)
      .maybeSingle();
    setFormDetail((detail as RequestFormDetail | null) ?? null);
  };

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      setSessionUserId(uid);
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        setSessionRole((profile?.role as "student" | "tutor" | "admin" | null) ?? null);
      }
      await refresh();
      setLoading(false);
    };
    load();
  }, [requestId]);

  const handleCheckout = async () => {
    setError(null);
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "決済セッションの作成に失敗しました");
      return;
    }
    const data = await response.json();
    window.location.href = data.url;
  };

  const handleDecision = async (action: "approve" | "reject") => {
    setError(null);
    if (!sessionUserId) return;
    const response = await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorId: sessionUserId, action })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "更新に失敗しました");
      return;
    }
    await refresh();
  };

  const handleComplete = async () => {
    setError(null);
    const response = await fetch("/api/stripe/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "決済確定に失敗しました");
      return;
    }
    await refresh();
  };

  const handleCancel = async () => {
    setError(null);
    const response = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "キャンセルに失敗しました");
      return;
    }
    await refresh();
  };

  const handleReview = async () => {
    setError(null);
    if (!sessionUserId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error: reviewError } = await supabase.from("reviews").insert({
      request_id: requestId,
      reviewer_id: sessionUserId,
      review_text: review,
      rating
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    setReview("");
  };

  if (loading) return <p className="text-sea">読み込み中...</p>;
  if (!request) return <p className="text-sea">依頼が見つかりません</p>;

  const isRequester = sessionUserId === request.requester_id;
  const isTutor = sessionUserId === request.tutor_id || (sessionRole === "tutor" && !request.tutor_id);
  const canOpenChat = ["escrowed", "completed"].includes(request.status);
  const showVideoButton = canOpenChat && formDetail?.support_method?.includes("オンライン");

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-sea">{request.title}</h2>
          <span className="text-sm px-3 py-1 rounded-full bg-cloud text-sea">{request.status}</span>
        </div>
        <p className="mt-3 text-sea/80 whitespace-pre-line">{request.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-sea/70">
          <span>依頼者: {request.requester_name ?? "-"}</span>
          <span>担当: {request.tutor_name ?? "未決定"}</span>
          <span>予算: ¥{request.budget.toLocaleString()}</span>
        </div>
      </div>

      {formDetail && (
        <div className="card p-6 grid gap-2 text-sm text-sea/80">
          <h3 className="text-lg font-semibold text-sea">申請内容</h3>
          <p>内容: {formDetail.support_topic}</p>
          <p>方法: {formDetail.support_method}</p>
          <p>時間: {formDetail.estimated_duration}</p>
          <p>期限: {formDetail.requested_deadline ?? "-"}</p>
          <p>提案価格: ¥{Number(formDetail.suggested_price ?? 0).toLocaleString()}</p>
          <p>設定価格: ¥{Number(formDetail.requested_price ?? 0).toLocaleString()}</p>
        </div>
      )}

      <div className="card p-6 grid gap-3">
        <h3 className="text-lg font-semibold text-sea">アクション</h3>
        {error && <p className="text-sm text-accent">{error}</p>}

        {isTutor && ["draft", "rejected"].includes(request.status) && (
          <button className="btn btn-primary" onClick={() => handleDecision("approve")}>
            依頼を承認する
          </button>
        )}
        {isTutor && ["draft", "accepted"].includes(request.status) && (
          <button className="btn btn-secondary" onClick={() => handleDecision("reject")}>
            依頼を却下する
          </button>
        )}

        {isRequester && request.status === "accepted" && (
          <button className="btn btn-primary" onClick={handleCheckout}>
            カード与信を確保する（Stripeへ）
          </button>
        )}
        {isRequester && request.status === "escrowed" && (
          <button className="btn btn-secondary" onClick={handleComplete}>
            対応完了 → 売上確定
          </button>
        )}
        {isRequester && ["accepted", "escrow_pending", "escrowed"].includes(request.status) && (
          <button className="btn border border-sea text-sea" onClick={handleCancel}>
            キャンセル（与信解放）
          </button>
        )}

        {canOpenChat && (
          <Link className="btn btn-primary" href={`/chat/${request.id}`}>
            チャットを開く
          </Link>
        )}
        {showVideoButton && (
          <button className="btn btn-secondary" disabled>
            ビデオ通話を開始（次フェーズで実装）
          </button>
        )}
      </div>

      {isRequester && request.status === "completed" && (
        <div className="card p-6 grid gap-3">
          <h3 className="text-lg font-semibold text-sea">レビュー</h3>
          <label className="grid gap-2">
            <span className="label">評価</span>
            <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="label">コメント</span>
            <textarea className="input h-24" value={review} onChange={(e) => setReview(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={handleReview}>
            レビュー送信
          </button>
        </div>
      )}
    </div>
  );
}
