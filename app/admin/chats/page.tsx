"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type AdminChatRequest = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  tutor_id: string | null;
  tutor_name: string;
  tutor_role: string | null;
};

type AdminChatMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function formatMessageContent(content: string) {
  try {
    const parsed = JSON.parse(content) as { kind?: string; text?: string; file?: { name?: string } };
    if (parsed.kind === "file") {
      return `📎 ${parsed.file?.name ?? "添付ファイル"}${parsed.text ? `\n${parsed.text}` : ""}`;
    }
    return parsed.text ?? content;
  } catch {
    return content;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "依頼作成",
    pending: "依頼確認中",
    accepted: "承認済み",
    payment_pending: "支払い待ち",
    escrowed: "支払い完了",
    in_progress: "相談実施中",
    review_pending: "評価待ち",
    completed: "完了",
    rejected: "却下",
    cancelled: "キャンセル"
  };
  return map[status] ?? status;
}

export default function AdminChatsPage() {
  const [items, setItems] = useState<AdminChatRequest[]>([]);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (nextKeyword = keyword, nextRequestId = selectedRequestId) => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const params = new URLSearchParams();
      if (nextKeyword.trim()) params.set("q", nextKeyword.trim());
      if (nextRequestId) params.set("requestId", nextRequestId);

      const res = await fetch(`/api/admin/chats/list${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "チャット監視一覧の取得に失敗しました");

      const nextItems = (payload.requests ?? []) as AdminChatRequest[];
      setItems(nextItems);
      const safeRequestId = nextRequestId || nextItems[0]?.id || "";
      setSelectedRequestId(safeRequestId);
      setMessages((payload.messages ?? []) as AdminChatMessage[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "チャット監視一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", "");
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedRequestId) ?? null,
    [items, selectedRequestId]
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">運営: チャット監視</h1>
            <p className="mt-2 text-sm text-[#6B7280]">通報前でも運営が全チャットの流れを確認できる監視画面です。問題発生時はここから対象取引を追跡できます。</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm"
              placeholder="依頼名 / ユーザー名 / 学校名"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(e.currentTarget.value, "");
              }}
            />
            <button
              type="button"
              onClick={() => void load(keyword, "")}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              検索
            </button>
            <Link href="/admin" className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]">
              管理トップへ
            </Link>
          </div>
        </div>
      </header>

      {error ? <p className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}

      <div className="mt-6 grid min-h-[70vh] grid-cols-[360px_minmax(0,1fr)] gap-6">
        <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="text-lg font-bold text-[#111827]">対象チャット</h2>
            <p className="mt-1 text-xs text-[#6B7280]">依頼ベースで一覧表示します。</p>
          </div>
          <div className="max-h-[68vh] space-y-2 overflow-y-auto p-4">
            {loading ? (
              <p className="text-sm text-[#6B7280]">読み込み中...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-[#6B7280]">チャットはありません。</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void load(keyword, item.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selectedRequestId === item.id
                      ? "border-[#BBF7D0] bg-[#F0FDF4]"
                      : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{item.requester_name} → {item.tutor_name}</p>
                    </div>
                    <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] font-semibold text-[#4338CA]">{statusLabel(item.status)}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#9CA3AF]">{formatDateTime(item.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] px-6 py-5">
            <h2 className="text-xl font-bold text-[#111827]">{selected?.title ?? "チャット詳細"}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {selected ? `${selected.requester_name}（${selected.requester_role === "student" ? "高校生" : selected.requester_role}） / ${selected.tutor_name}（${selected.tutor_role === "tutor" ? "大学生" : selected.tutor_role ?? "未設定"}）` : "左から対象を選択してください。"}
            </p>
          </div>

          <div className="max-h-[68vh] space-y-4 overflow-y-auto bg-[#F9FAFB] px-6 py-6">
            {!selected ? (
              <p className="text-sm text-[#6B7280]">対象チャットを選択してください。</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-[#6B7280]">メッセージはまだありません。</p>
            ) : (
              messages.map((message) => {
                const isRequester = message.sender_id === selected.requester_id;
                return (
                  <div key={message.id} className={`flex ${isRequester ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${isRequester ? "bg-white text-[#111827]" : "bg-[#DCFCE7] text-[#166534]"}`}>
                      <div className="mb-1 flex items-center gap-2 text-[11px]">
                        <span className="font-semibold">{isRequester ? selected.requester_name : selected.tutor_name}</span>
                        <span className="text-[#9CA3AF]">{formatDateTime(message.created_at)}</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-sm font-sans">{formatMessageContent(message.content)}</pre>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
