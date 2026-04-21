"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { BrandIcon } from "../../../components/BrandLogo";
import ReportDialog from "../../../components/ReportDialog";

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

function statusText(status: string) {
  if (status === "rejected") return "Rejected";
  if (status === "canceled") return "Canceled";
  if (status === "draft") return "Pending";
  if (status === "accepted") return "Waiting Payment";
  if (status === "escrow_pending") return "Escrow Pending";
  if (status === "escrowed") return "In Session";
  if (status === "completed") return "Completed";
  return status;
}

function statusChip(status: string) {
  if (status === "rejected" || status === "canceled") return "bg-gray-100 text-gray-600 border-gray-200";
  if (status === "accepted" || status === "escrow_pending") return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "escrowed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "completed") return "bg-purple-50 text-purple-700 border-purple-100";
  return "bg-gray-100 text-gray-600 border-gray-200";
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
  const [actionLoading, setActionLoading] = useState(false);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);

  const refresh = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabaseが初期化されていません");

    const { data, error: requestError } = await supabase
      .from("requests_with_profile")
      .select("*")
      .eq("id", requestId)
      .single();
    if (requestError) throw new Error(requestError.message);
    setRequest(data as RequestDetail);

    const { data: detail, error: detailError } = await supabase
      .from("request_details")
      .select("support_topic, support_method, estimated_duration, requested_deadline, suggested_price, requested_price")
      .eq("request_id", requestId)
      .maybeSingle();
    if (detailError) throw new Error(detailError.message);
    setFormDetail((detail as RequestFormDetail | null) ?? null);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabaseが初期化されていません");

        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user.id ?? null;
        setSessionUserId(uid);

        if (uid) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
          setSessionRole((profile?.role as "student" | "tutor" | "admin" | null) ?? null);
        }

        await refresh();
      } catch (error) {
        console.error("Failed to load request detail", error);
        setError(error instanceof Error ? error.message : "依頼詳細の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [requestId]);

  const handleCheckout = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "決済セッションの作成に失敗しました");
      if (!data.url) throw new Error("決済ページURLの取得に失敗しました");

      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to create checkout session", error);
      setError(error instanceof Error ? error.message : "決済セッションの作成に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecision = async (action: "approve" | "reject") => {
    setError(null);
    if (!sessionUserId) return;
    setActionLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");

      const response = await fetch(`/api/requests/${requestId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tutorId: sessionUserId, action })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "更新に失敗しました");

      await refresh();
    } catch (error) {
      console.error("Failed to update request decision", error);
      setError(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");
      const response = await fetch("/api/stripe/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "決済確定に失敗しました");
      await refresh();
    } catch (error) {
      console.error("Failed to capture payment", error);
      setError(error instanceof Error ? error.message : "決済確定に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.access_token) throw new Error("ログインセッションが見つかりません");
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requestId })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "キャンセルに失敗しました");
      await refresh();
    } catch (error) {
      console.error("Failed to cancel request", error);
      setError(error instanceof Error ? error.message : "キャンセルに失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    setError(null);
    if (!sessionUserId) return;
    setActionLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");

      const { error: reviewError } = await supabase.from("reviews").insert({
        request_id: requestId,
        reviewer_id: sessionUserId,
        review_text: review,
        rating
      });

      if (reviewError) throw new Error(reviewError.message);
      setReview("");
    } catch (error) {
      console.error("Failed to submit review", error);
      setError(error instanceof Error ? error.message : "レビュー送信に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p className="text-slate-600">読み込み中...</p>;
  if (!request) return <p className="text-slate-600">依頼が見つかりません</p>;

  const isRequester = sessionUserId === request.requester_id;
  const isTutor = sessionUserId === request.tutor_id || (sessionRole === "tutor" && !request.tutor_id);
  const canOpenChat = ["escrowed", "completed"].includes(request.status);
  const showVideoButton = canOpenChat && formDetail?.support_method?.includes("オンライン");
  const videoCallsEnabled = process.env.NEXT_PUBLIC_VIDEO_CALLS_ENABLED === "true";
  const allowApprove = isTutor && request.status === "draft";

  const requestedPrice = Number(formDetail?.requested_price ?? request.budget ?? 0);
  const deadline = formDetail?.requested_deadline ?? "-";

  return (
    <div className="relative left-1/2 w-dvw max-w-[100dvw] -translate-x-1/2 overflow-x-hidden bg-[#FAFAFA] min-h-screen">
      <header className="sticky top-0 z-10 w-full border-b border-[#E5E7EB] bg-white/95">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <nav className="flex text-sm font-medium text-[#6B7280]">
            <Link className="hover:text-[#34D399] transition-colors" href="/requests">取引管理</Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-[#1F2937]">詳細</span>
          </nav>
          <div className="flex items-center gap-4">
            <div className="group relative -m-2 p-2">
              <Link
                href="/notifications"
                className="block rounded-md px-2 py-1 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#34D399]"
                aria-label="通知センターを開く"
              >
                🔔
              </Link>
              <div className="absolute right-0 top-full z-50 hidden w-80 pt-2 group-hover:block group-focus-within:block">
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-semibold tracking-wide text-[#6B7280]">最新の通知</p>
                <ul className="space-y-2 text-sm text-[#374151]">
                  <li>
                    <Link href="/notifications?n=n1" className="block rounded-lg bg-[#F9FAFB] p-2 transition-colors hover:bg-[#F3F4F6]">
                      取引のステータスが更新されました
                    </Link>
                  </li>
                  <li>
                    <Link href="/notifications?n=n2" className="block rounded-lg bg-[#F9FAFB] p-2 transition-colors hover:bg-[#F3F4F6]">
                      支払い待ちの申請があります
                    </Link>
                  </li>
                  <li>
                    <Link href="/notifications?n=n3" className="block rounded-lg bg-[#F9FAFB] p-2 transition-colors hover:bg-[#F3F4F6]">
                      レビュー投稿が完了しました
                    </Link>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-[#34D399]">クリックで通知センターへ</p>
                </div>
              </div>
            </div>
            <BrandIcon size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-32 pt-10">
        <section className="mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusChip(request.status)}`}>
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" /> {statusText(request.status)}
                </span>
                <span className="text-xs font-mono text-[#6B7280]">ID: #{request.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#1F2937]">{request.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-[#6B7280]">
                <div className="flex items-center">👤 <span className="ml-1">Client: {request.requester_name ?? "-"}</span></div>
                <div className="flex items-center">🏷️ <span className="ml-1">Assignee: {request.tutor_name ?? "未割当"}</span></div>
              </div>
            </div>
            <div className="hidden text-right md:block">
              <div className="mb-1 text-sm text-[#6B7280]">予算</div>
              <div className="text-2xl font-bold font-mono text-[#1F2937]">¥{requestedPrice.toLocaleString()}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)]">
              <h2 className="mb-6 flex items-center text-sm font-semibold uppercase tracking-wider text-[#6B7280]">ℹ️ 概要</h2>
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-5">
                  <dt className="mb-1 text-xs font-medium text-[#6B7280]">方法</dt>
                  <dd className="flex items-center text-sm font-medium text-[#1F2937]">💬 <span className="ml-2">{formDetail?.support_method || "-"}</span></dd>
                </div>
                <div className="border-b border-[#E5E7EB] pb-5">
                  <dt className="mb-1 text-xs font-medium text-[#6B7280]">想定時間</dt>
                  <dd className="flex items-center text-sm font-medium text-[#1F2937]">⏱️ <span className="ml-2">{formDetail?.estimated_duration || "-"}</span></dd>
                </div>
                <div className="border-b border-[#E5E7EB] pb-5">
                  <dt className="mb-1 text-xs font-medium text-[#6B7280]">希望期限</dt>
                  <dd className="flex items-center text-sm font-medium text-[#1F2937]">📅 <span className="ml-2">{deadline}</span></dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-medium text-[#6B7280]">提案価格</dt>
                  <dd className="flex items-center text-sm font-medium text-[#1F2937]">💴 <span className="ml-2">¥{requestedPrice.toLocaleString()}</span></dd>
                </div>
              </div>
            </div>

            <div className="rounded border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)]">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#6B7280]">設定価格詳細</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">設定価格</span>
                <span className="font-medium text-[#1F2937]">¥{requestedPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="h-full rounded border border-[#E5E7EB] bg-white p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)]">
              <h2 className="mb-6 text-lg font-semibold text-[#1F2937]">📝 相談・申請内容</h2>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line text-base leading-relaxed text-gray-700">{request.description}</p>
              </div>

              <div className="mt-10 border-t border-[#E5E7EB] pt-6">
                <h3 className="mb-3 text-sm font-medium text-[#6B7280]">添付ファイル</h3>
                <div className="w-fit cursor-pointer rounded-lg border border-[#E5E7EB] bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                  <div className="text-sm font-medium text-[#1F2937]">questions_list.pdf</div>
                  <div className="text-xs text-gray-500">245 KB</div>
                </div>
              </div>

              {isRequester && request.status === "completed" ? (
                <div className="mt-8 grid gap-3">
                  <h3 className="text-lg font-semibold text-[#1F2937]">レビュー</h3>
                  <label className="grid gap-2">
                    <span className="text-sm text-[#6B7280]">評価</span>
                    <select className="rounded-lg border-[#E5E7EB]" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm text-[#6B7280]">コメント</span>
                    <textarea className="h-24 rounded-lg border-[#E5E7EB]" value={review} onChange={(e) => setReview(e.target.value)} />
                  </label>
                  <button
                    className="w-fit rounded-lg bg-[#34D399] px-5 py-2 text-sm font-semibold text-white hover:bg-[#10B981] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleReview}
                    disabled={actionLoading}
                  >
                    レビュー送信
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {error ? (
        <div className="fixed bottom-28 left-0 right-0 z-50">
          <div className="mx-auto max-w-5xl px-6">
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-5xl px-6 pb-6">
          <div className="pointer-events-auto flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white/95 p-4 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] backdrop-blur-md">
            <div className="hidden flex-col md:flex">
              <span className="text-xs text-[#6B7280]">現在のステータス</span>
              <span className="text-sm font-medium text-[#1F2937]">{statusText(request.status)}</span>
            </div>

            <div className="flex w-full items-center gap-3 md:w-auto">
              <ReportDialog
                reportType="request"
                targetUserId={isRequester ? request.tutor_id : request.requester_id}
                requestId={requestId}
                triggerLabel="通報"
                triggerClassName="flex-1 rounded-lg border border-rose-200 px-5 py-2.5 text-center text-sm font-medium text-rose-700 hover:bg-rose-50 md:flex-none"
              />

              <Link
                href={`/requests/new${request.tutor_id ? `?tutorId=${request.tutor_id}` : ""}`}
                className="flex-1 rounded-lg border border-gray-300 px-6 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 md:flex-none"
              >
                再申請を依頼
              </Link>

              {allowApprove ? (
                <button
                  className="flex flex-1 items-center justify-center rounded-lg bg-[#34D399] px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-[#10B981] disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
                  onClick={() => handleDecision("approve")}
                  disabled={actionLoading}
                >
                  依頼を承認する
                </button>
              ) : (
                <button
                  className="flex flex-1 items-center justify-center rounded-lg bg-gray-200 px-8 py-2.5 text-sm font-semibold text-gray-500 md:flex-none"
                  disabled
                >
                  依頼を承認する
                </button>
              )}

              {isTutor && ["draft", "accepted"].includes(request.status) ? (
                <button
                  className="rounded-lg border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleDecision("reject")}
                  disabled={actionLoading}
                >
                  却下
                </button>
              ) : null}

              {isRequester && request.status === "accepted" ? (
                <button
                  className="rounded-lg bg-[#34D399] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10B981] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleCheckout}
                  disabled={actionLoading}
                >
                  与信確保
                </button>
              ) : null}

              {isRequester && request.status === "escrowed" ? (
                <button
                  className="rounded-lg bg-[#34D399] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10B981] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleComplete}
                  disabled={actionLoading}
                >
                  売上確定
                </button>
              ) : null}

              {isRequester && ["accepted", "escrow_pending", "escrowed"].includes(request.status) ? (
                <button
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  キャンセル
                </button>
              ) : null}

              {canOpenChat ? (
                <Link className="rounded-lg border border-[#34D399] px-5 py-2.5 text-sm font-semibold text-[#10B981] hover:bg-emerald-50" href={`/chat/${request.id}`}>
                  チャット
                </Link>
              ) : null}

              {showVideoButton && videoCallsEnabled ? (
                <Link className="rounded-lg border border-[#34D399] px-5 py-2.5 text-sm font-semibold text-[#10B981] hover:bg-emerald-50" href={`/call/${request.id}`}>
                  ビデオ通話
                </Link>
              ) : showVideoButton ? (
                <button className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-500" disabled>
                  通話準備中
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
