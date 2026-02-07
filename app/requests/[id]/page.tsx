"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";

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

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);

  const refresh = async () => {
    const { data } = await supabase
      .from("requests_with_profile")
      .select("*")
      .eq("id", requestId)
      .single();
    setRequest(data as RequestDetail);
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSessionUserId(sessionData.session?.user.id ?? null);
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
      setError("決済セッションの作成に失敗しました（受注者のStripe連携が必要です）");
      return;
    }
    const data = await response.json();
    window.location.href = data.url;
  };

  const handleAccept = async () => {
    setError(null);
    if (!sessionUserId) return;
    const { error } = await supabase
      .from("requests")
      .update({ status: "accepted", tutor_id: sessionUserId })
      .eq("id", requestId);
    if (error) {
      setError(error.message);
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
      setError("決済確定に失敗しました");
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
      setError("キャンセルに失敗しました");
      return;
    }
    await refresh();
  };

  const handleReview = async () => {
    setError(null);
    if (!sessionUserId) return;
    const { error } = await supabase.from("reviews").insert({
      request_id: requestId,
      reviewer_id: sessionUserId,
      review_text: review,
      rating
    });
    if (error) {
      setError(error.message);
      return;
    }
    setReview("");
  };

  if (loading) {
    return <p className="text-sea">読み込み中...</p>;
  }

  if (!request) {
    return <p className="text-sea">依頼が見つかりません</p>;
  }

  const isRequester = sessionUserId === request.requester_id;
  const isTutor = sessionUserId === request.tutor_id;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-sea">{request.title}</h2>
          <span className="text-sm text-sea/70">{request.status}</span>
        </div>
        <p className="mt-3 text-sea/80">{request.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-sea/70">
          <span>依頼者: {request.requester_name ?? "-"}</span>
          <span>担当: {request.tutor_name ?? "未決定"}</span>
          <span>予算: ¥{request.budget.toLocaleString()}</span>
        </div>
      </div>

      <div className="card p-6 grid gap-3">
        <h3 className="text-lg font-semibold text-sea">アクション</h3>
        {error && <p className="text-sm text-accent">{error}</p>}
        {!request.tutor_id && !isRequester && (
          <button className="btn btn-primary" onClick={handleAccept}>この依頼を受注</button>
        )}
        {isRequester && request.status === "accepted" && (
          <button className="btn btn-primary" onClick={handleCheckout}>支払いを確定（エスクロー）</button>
        )}
        {isRequester && request.status === "escrowed" && (
          <button className="btn btn-secondary" onClick={handleComplete}>対応完了 → 決済確定</button>
        )}
        {isRequester && request.status === "escrowed" && (
          <button className="btn border border-sea text-sea" onClick={handleCancel}>キャンセル</button>
        )}
        {(isRequester || isTutor) && request.tutor_id && (
          <Link className="btn btn-secondary" href={`/chat/${request.id}`}>チャットを開く</Link>
        )}
      </div>

      {isRequester && (
        <div className="card p-6 grid gap-3">
          <h3 className="text-lg font-semibold text-sea">レビュー</h3>
          <label className="grid gap-2">
            <span className="label">評価</span>
            <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="label">コメント</span>
            <textarea className="input h-24" value={review} onChange={(e) => setReview(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={handleReview}>レビュー送信</button>
        </div>
      )}
    </div>
  );
}
