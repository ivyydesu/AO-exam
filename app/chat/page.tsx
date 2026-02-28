"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase/client";

type ChatRequest = {
  id: string;
  title: string;
  status: string;
  requester_id: string;
  tutor_id: string | null;
  created_at: string;
};

type Message = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type ParsedMessage = Message & {
  kind: "text" | "file";
  text: string;
  file?: {
    name: string;
    mimeType: string;
    size: number;
    url: string;
    path?: string;
  };
};

type Counterparty = {
  id: string;
  full_name: string;
  school: string | null;
  avatar_url?: string;
};

type RequestDetail = {
  request_id: string;
  support_method: string | null;
  requested_deadline: string | null;
};

function ToolLink({ href, label, icon, active = false }: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center rounded-lg p-3 transition-colors ${active ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#10B981]"}`}>
      <span className="text-[22px]">{icon}</span>
      <span className="ml-3 hidden lg:block">{label}</span>
    </Link>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "依頼作成",
    pending: "依頼確認中",
    accepted: "支払い待ち",
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

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function parseMessage(raw: Message): ParsedMessage {
  try {
    const parsed = JSON.parse(raw.content) as {
      kind?: string;
      text?: string;
      file?: { name?: string; mimeType?: string; size?: number; url?: string; path?: string };
    };
    if (parsed.kind === "file" && parsed.file?.name && parsed.file?.mimeType && parsed.file?.url) {
      return {
        ...raw,
        kind: "file",
        text: parsed.text ?? "",
        file: {
          name: parsed.file.name,
          mimeType: parsed.file.mimeType,
          size: Number(parsed.file.size ?? 0),
          url: parsed.file.url,
          path: parsed.file.path
        }
      };
    }
  } catch {
    // plain text message
  }

  return {
    ...raw,
    kind: "text",
    text: raw.content
  };
}

export default function ChatHomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [messagesByRequest, setMessagesByRequest] = useState<Record<string, ParsedMessage[]>>({});
  const [profiles, setProfiles] = useState<Record<string, Counterparty>>({});
  const [detailsByRequest, setDetailsByRequest] = useState<Record<string, RequestDetail>>({});
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [readByRequest, setReadByRequest] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabaseが初期化されていません");
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user.id ?? null;
        if (!uid) {
          router.push("/auth/login");
          return;
        }
        setUserId(uid);
        const savedRead = window.localStorage.getItem(`chat-read:${uid}`);
        if (savedRead) {
          try {
            setReadByRequest(JSON.parse(savedRead) as Record<string, string>);
          } catch {
            // no-op
          }
        }

        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("requestId") ?? "";

        const { data: reqs, error: reqError } = await supabase
          .from("requests")
          .select("id, title, status, requester_id, tutor_id, created_at")
          .or(`requester_id.eq.${uid},tutor_id.eq.${uid}`)
          .order("created_at", { ascending: false });
        if (reqError) throw new Error(reqError.message);

        const nextRequests = (reqs as ChatRequest[] | null) ?? [];
        setRequests(nextRequests);

        const requestIds = nextRequests.map((item) => item.id);
        if (requestIds.length === 0) {
          setSelectedRequestId("");
          setLoading(false);
          return;
        }

        setSelectedRequestId(requestedId && requestIds.includes(requestedId) ? requestedId : requestIds[0]);

        const participantIds = Array.from(
          new Set(
            nextRequests.flatMap((item) => [item.requester_id, item.tutor_id].filter(Boolean) as string[])
          )
        );

        const [messageRes, profileRes, tutorProfileRes, detailRes] = await Promise.all([
          supabase
            .from("messages")
            .select("id, request_id, sender_id, content, created_at")
            .in("request_id", requestIds)
            .order("created_at", { ascending: true }),
          supabase.from("profiles").select("id, full_name, school").in("id", participantIds),
          supabase.from("tutor_profiles").select("user_id, avatar_url").in("user_id", participantIds),
          supabase.from("request_details").select("request_id, support_method, requested_deadline").in("request_id", requestIds)
        ]);

        if (messageRes.error) throw new Error(messageRes.error.message);
        if (profileRes.error) throw new Error(profileRes.error.message);
        if (tutorProfileRes.error && !String(tutorProfileRes.error.message).includes("schema cache")) {
          throw new Error(tutorProfileRes.error.message);
        }
        if (detailRes.error && !String(detailRes.error.message).includes("schema cache")) {
          throw new Error(detailRes.error.message);
        }

        const groupedMessages = ((messageRes.data as Message[] | null) ?? []).reduce<Record<string, ParsedMessage[]>>((acc, item) => {
          if (!acc[item.request_id]) acc[item.request_id] = [];
          acc[item.request_id].push(parseMessage(item));
          return acc;
        }, {});
        setMessagesByRequest(groupedMessages);

        const avatarMap = Object.fromEntries(((tutorProfileRes.data as Array<{ user_id: string; avatar_url: string | null }> | null) ?? []).map((item) => [item.user_id, item.avatar_url ?? ""]));
        const profileMap = Object.fromEntries(
          (((profileRes.data as Array<{ id: string; full_name: string; school: string | null }> | null) ?? []).map((item) => [
            item.id,
            { ...item, avatar_url: avatarMap[item.id] ?? "" }
          ]))
        );
        setProfiles(profileMap);

        const detailMap = Object.fromEntries(((detailRes.data as RequestDetail[] | null) ?? []).map((item) => [item.request_id, item]));
        setDetailsByRequest(detailMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "チャットの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return;
    const channel = supabase
      .channel(`messages-all-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const item = parseMessage(payload.new as Message);
        setMessagesByRequest((prev) => ({
          ...prev,
          [item.request_id]: [...(prev[item.request_id] ?? []), item]
        }));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(`chat-read:${userId}`, JSON.stringify(readByRequest));
  }, [readByRequest, userId]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? requests.filter((item) => {
          const otherId = userId === item.requester_id ? item.tutor_id : item.requester_id;
          const other = otherId ? profiles[otherId] : null;
          return [item.title, other?.full_name, other?.school, statusLabel(item.status)]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q));
        })
      : requests;

    return [...base].sort((a, b) => {
      const aLatest = (messagesByRequest[a.id] ?? []).at(-1)?.created_at ?? a.created_at;
      const bLatest = (messagesByRequest[b.id] ?? []).at(-1)?.created_at ?? b.created_at;
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
  }, [requests, profiles, search, userId, messagesByRequest]);

  const selectedRequest = requests.find((item) => item.id === selectedRequestId) ?? null;
  const selectedMessages = selectedRequest ? messagesByRequest[selectedRequest.id] ?? [] : [];
  const selectedOtherId = selectedRequest
    ? userId === selectedRequest.requester_id
      ? selectedRequest.tutor_id
      : selectedRequest.requester_id
    : null;
  const selectedOther = selectedOtherId ? profiles[selectedOtherId] : null;
  const selectedDetail = selectedRequest ? detailsByRequest[selectedRequest.id] : undefined;
  const canChat = selectedRequest ? !["rejected", "canceled", "cancelled"].includes(selectedRequest.status) : false;
  const isOnlineMethod = Boolean(selectedDetail?.support_method?.includes("オンライン"));
  const videoCallsEnabled = process.env.NEXT_PUBLIC_VIDEO_CALLS_ENABLED !== "false";

  useEffect(() => {
    if (!selectedRequest) return;
    const latestTs = (messagesByRequest[selectedRequest.id] ?? []).at(-1)?.created_at;
    if (!latestTs) return;
    setReadByRequest((prev) => ({ ...prev, [selectedRequest.id]: latestTs }));
  }, [selectedRequest, messagesByRequest]);

  const sendMessage = async () => {
    if (!content.trim() || !userId || !selectedRequest || !canChat) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const message = content.trim();
    setContent("");
    const { error: insertError } = await supabase.from("messages").insert({
      request_id: selectedRequest.id,
      sender_id: userId,
      content: message
    });
    if (insertError) {
      setError(insertError.message);
      setContent(message);
    }
  };

  const sendFile = async (file: File) => {
    if (!userId || !selectedRequest || !canChat) return;
    try {
      setUploading(true);
      setError(null);
      if (file.size > 20 * 1024 * 1024) throw new Error("ファイルは20MB以下にしてください");
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("セッションが切れています。再ログインしてください。");

      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch(`/api/calls/${selectedRequest.id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData?.file) {
        throw new Error(uploadData?.error ?? "ファイルアップロードに失敗しました");
      }

      const payload = {
        kind: "file",
        text: "",
        file: {
          name: uploadData.file.name,
          mimeType: uploadData.file.mimeType,
          size: uploadData.file.size,
          path: uploadData.file.path,
          url: uploadData.file.url
        }
      };
      const { error: insertError } = await supabase.from("messages").insert({
        request_id: selectedRequest.id,
        sender_id: userId,
        content: JSON.stringify(payload)
      });
      if (insertError) throw new Error(insertError.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ファイル送信に失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openCalendar = () => {
    if (!selectedRequest) return;
    router.push(`/calendar?requestId=${selectedRequest.id}`);
  };

  if (loading) {
    return <div className="grid min-h-[70vh] place-items-center text-sm text-[#5e8d7f]">読み込み中...</div>;
  }

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="flex h-[calc(100vh-81px)] min-h-[calc(100vh-81px)] overflow-hidden bg-[#F9FAFB] text-[#111827]">
        <aside className="w-20 shrink-0 border-r border-[#E5E7EB] bg-white/98 lg:w-64">
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-8">
              <ToolLink href="/calendar" label="スケジュール" icon="📅" />
              <ToolLink href="/chat" label="メッセージ" icon="💬" active />
              <ToolLink href="/demo/request" label="申請状況" icon="📋" />
            </nav>
          </div>
        </aside>

        <aside className="flex h-full min-h-0 w-[380px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white">
          <div className="border-b border-[#E5E7EB] px-6 py-5">
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">メッセージ</h2>
            <p className="mt-1 text-sm text-[#6B7280]">進行中のやり取りを一覧で確認できます。</p>
          </div>
          <div className="border-b border-[#F3F4F6] px-6 py-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
              <input
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 text-sm text-[#101816] outline-none transition-all placeholder:text-gray-400 focus:border-[#00b884]/30 focus:bg-white"
                placeholder="チャットを検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {filteredRequests.map((item) => {
              const otherId = userId === item.requester_id ? item.tutor_id : item.requester_id;
              const other = otherId ? profiles[otherId] : null;
              const latest = (messagesByRequest[item.id] ?? []).at(-1);
              const unread = Boolean(latest && latest.sender_id !== userId && (readByRequest[item.id] ?? "") < latest.created_at);
              const latestPreview = latest
                ? latest.kind === "file" && latest.file
                  ? `📎 ${latest.file.name}`
                  : latest.text
                : item.title || statusLabel(item.status);
              const active = item.id === selectedRequestId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedRequestId(item.id);
                    const latestTs = (messagesByRequest[item.id] ?? []).at(-1)?.created_at;
                    if (latestTs) setReadByRequest((prev) => ({ ...prev, [item.id]: latestTs }));
                  }}
                  className={`group relative flex w-full gap-3 rounded-xl border px-4 py-4 text-left transition-all ${active ? "border-[#D1FAE5] bg-[#F0FDF4] shadow-[0_4px_10px_rgba(16,185,129,0.08)]" : "border-transparent bg-[#F9FAFB] hover:border-[#E5E7EB] hover:bg-white"}`}
                >
                  <div className="relative shrink-0">
                    {other?.avatar_url ? (
                      <img src={other.avatar_url} alt={other.full_name} className="size-12 rounded-full object-cover" />
                    ) : (
                      <div className="grid size-12 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-600">{(other?.full_name || "?").slice(0, 1)}</div>
                    )}
                    <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-[#00b884]" />
                  </div>
                  <div className="min-w-0 flex-1 justify-center">
                    <div className="mb-0.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{other?.full_name || "相手未設定"}</span>
                      <span className={`text-xs ${active ? "font-medium text-[#00b884]" : "text-gray-400"}`}>{latest ? formatDate(latest.created_at) : formatDate(item.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[#5e8d7f]">{latestPreview}</span>
                      {unread ? <span className="size-5 rounded-full bg-[#00b884] text-center text-[10px] font-bold leading-5 text-white">N</span> : null}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">{statusLabel(item.status)}</div>
                  </div>
                  {active ? <div className="absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full bg-[#00b884]" /> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="relative flex h-full min-h-0 flex-1 flex-col bg-white">
          {selectedRequest ? (
            <>
              <header className="glass-panel absolute left-0 right-0 top-0 z-10 flex h-16 w-full items-center justify-between border-b border-[#e2e8e6] px-6 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {selectedOther?.avatar_url ? (
                      <img src={selectedOther.avatar_url} alt={selectedOther.full_name} className="size-10 rounded-full object-cover ring-2 ring-white" />
                    ) : (
                      <div className="grid size-10 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-600">{(selectedOther?.full_name || "?").slice(0, 1)}</div>
                    )}
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#00b884]" />
                  </div>
                  <div>
                    <h1 className="flex items-center gap-2 text-base font-bold">
                      {selectedOther?.full_name || "相手未設定"}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">{selectedOther?.school || selectedRequest.title}</span>
                    </h1>
                    <p className="text-xs font-medium text-[#00b884]">{statusLabel(selectedRequest.status)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openCalendar} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#5e8d7f] transition hover:bg-gray-100 hover:text-[#101816]">
                    <span>📅</span>
                    <span className="hidden sm:inline">スケジュール</span>
                  </button>
                  <div className="mx-1 h-4 w-px bg-gray-200" />
                  {isOnlineMethod && videoCallsEnabled ? (
                    <button
                      onClick={() => window.open(`/call/${selectedRequest.id}`, "_blank")}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#5e8d7f] transition hover:bg-gray-100 hover:text-[#101816]"
                    >
                      ビデオ通話
                    </button>
                  ) : isOnlineMethod ? (
                    <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#9CA3AF]">
                      通話準備中
                    </span>
                  ) : null}
                  <Link href={`/requests/${selectedRequest.id}`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#5e8d7f] transition hover:bg-gray-100 hover:text-[#101816]">詳細</Link>
                </div>
              </header>

              <div className="flex-1 min-h-0 space-y-6 overflow-y-auto px-6 pb-4 pt-20">
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">Today</span>
                </div>
                {selectedMessages.length === 0 ? (
                  <div className="text-sm text-[#5e8d7f]">まだメッセージがありません。</div>
                ) : (
                  selectedMessages.map((message) => {
                    const mine = message.sender_id === userId;
                    return (
                      <div key={message.id} className={`flex max-w-[80%] gap-3 ${mine ? "ml-auto flex-row-reverse" : ""}`}>
                        {!mine ? (
                          selectedOther?.avatar_url ? (
                            <img src={selectedOther.avatar_url} alt={selectedOther.full_name} className="mt-1 size-8 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{(selectedOther?.full_name || "?").slice(0, 1)}</div>
                          )
                        ) : (
                          <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-[#dff7ef] text-xs font-bold text-[#00b884]">You</div>
                        )}
                        <div className={`flex flex-col gap-1 ${mine ? "items-end" : ""}`}>
                          <div className={`flex items-baseline gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                            {!mine ? <span className="text-xs font-bold">{selectedOther?.full_name || "相手"}</span> : null}
                            <span className="text-[10px] text-gray-400">{formatTime(message.created_at)}</span>
                          </div>
                          {message.kind === "file" && message.file ? (
                            <div className={`w-[340px] max-w-full rounded-2xl border p-3 shadow-sm ${mine ? "border-[#0ea371] bg-[#00b884]/10" : "border-[#E5E7EB] bg-white"}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#111827]">{message.file.name}</p>
                                  <p className="text-xs text-gray-500">{formatSize(message.file.size)} ・ {message.file.mimeType}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <a
                                    href={message.file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-gray-50"
                                  >
                                    開く
                                  </a>
                                </div>
                              </div>
                              {message.file.mimeType.startsWith("image/") ? (
                                <a href={message.file.url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-[#E5E7EB]">
                                  <img src={message.file.url} alt={message.file.name} className="h-40 w-full object-cover" />
                                </a>
                              ) : null}
                              {message.text ? <p className="mt-2 rounded-lg bg-gray-50 px-2 py-1.5 text-sm text-[#374151]">{message.text}</p> : null}
                            </div>
                          ) : (
                            <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${mine ? "rounded-2xl rounded-tr-none bg-[#00b884] text-white shadow-[#00b884]/20" : "rounded-2xl rounded-tl-none bg-gray-100 text-[#101816]"}`}>
                              <p>{message.text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-[#e2e8e6] bg-white px-6 py-4">
                {canChat ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#e2e8e6] bg-[#fbfdfd] px-4 py-3 shadow-sm">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void sendFile(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d1d5db] text-[#5e8d7f] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60"
                      title="ファイル送信"
                    >
                      +
                    </button>
                    <textarea
                      className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="メッセージを入力"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={uploading || !content.trim()}
                      className="grid size-11 place-items-center rounded-full bg-[#00b884] text-white shadow-[0_0_15px_rgba(0,184,132,0.15)] transition hover:bg-[#00a374] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ➤
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#e2e8e6] bg-[#fbfdfd] px-4 py-3 text-sm text-[#5e8d7f]">
                    この依頼は現在チャットできません。状態: {statusLabel(selectedRequest.status)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-[#5e8d7f]">チャットがありません。</div>
          )}
          {error ? <div className="absolute bottom-4 right-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
        </main>
      </div>
    </div>
  );
}
