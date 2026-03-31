"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ReportDialog from "../../../components/ReportDialog";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { sanitizeVideoCallError } from "../../../lib/videoCalls";

declare global {
  interface Window {
    DailyIframe?: {
      createFrame: (el: HTMLElement, options?: Record<string, unknown>) => DailyCallFrame;
    };
  }
}

type DailyCallFrame = {
  on: (event: string, cb: (ev?: any) => void) => void;
  join: (options: Record<string, unknown>) => Promise<void>;
  leave: () => Promise<void>;
  destroy: () => void;
  setLocalAudio: (enabled: boolean) => Promise<void> | void;
  setLocalVideo: (enabled: boolean) => Promise<void> | void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  startRecording?: (options?: Record<string, unknown>) => Promise<void>;
  stopRecording?: () => Promise<void>;
  cycleCamera?: () => Promise<void>;
  cycleMic?: () => Promise<void>;
};

type Participant = {
  id: string;
  name: string;
  role: string;
  school: string | null;
  avatarUrl: string;
};

type CallEvent = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
};

type DailySessionPayload = {
  roomName: string;
  roomUrl: string;
  token: string;
  canManage: boolean;
  role: string;
  participants: Participant[];
  events: CallEvent[];
  session: {
    moderatorUserId: string;
    recordingStatus: string;
    startedAt: string;
  };
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  kind: "text" | "file";
  file?: {
    name: string;
    mimeType: string;
    size: number;
    url: string;
    path?: string;
  };
  createdAt: string;
};

type SidebarTab = "chat" | "people" | "files";

type SharedFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sizeLabel: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
};

type QuickViewFile = SharedFile | ChatMessage["file"];

function isPreviewable(file?: QuickViewFile | null) {
  if (!file) return false;
  return file.mimeType.startsWith("image/") || file.mimeType === "application/pdf" || file.mimeType.startsWith("text/");
}

function parseMessageContent(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      kind?: string;
      text?: string;
      file?: { name?: string; mimeType?: string; size?: number; url?: string; path?: string };
    };
    if (parsed.kind === "file" && parsed.file?.name && parsed.file?.mimeType && parsed.file?.url) {
      return {
        kind: "file" as const,
        content: parsed.text ?? "",
        file: {
          name: parsed.file.name,
          mimeType: parsed.file.mimeType,
          size: Number(parsed.file.size ?? 0),
          url: parsed.file.url,
          path: parsed.file.path
        }
      };
    }
  } catch {}

  return { kind: "text" as const, content: raw };
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function formatEventLabel(event: CallEvent, me: string) {
  const self = event.user_id === me ? "あなた" : "参加者";
  const map: Record<string, string> = {
    joined: `${self}が入室しました`,
    left: `${self}が退室しました`,
    participant_joined: "参加者が会議に参加しました",
    participant_left: "参加者が会議から退出しました",
    recording_started: "録画を開始しました",
    recording_stopped: "録画を停止しました",
    microphone_muted: `${self}がマイクをミュートしました`,
    microphone_unmuted: `${self}がマイクをオンにしました`,
    camera_muted: `${self}がカメラをオフにしました`,
    camera_unmuted: `${self}がカメラをオンにしました`,
    screen_share_started: `${self}が画面共有を開始しました`,
    screen_share_stopped: `${self}が画面共有を停止しました`,
    hand_raised: `${self}が挙手しました`,
    session_ended: "通話を終了しました"
  };
  return map[event.event_type] ?? event.event_type;
}

function iconClass() {
  return "h-5 w-5";
}

function PhoneOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass()}>
      <path d="M10.5 13.5a14 14 0 0 0 5 5l1.5-1.5a1 1 0 0 1 1-.24 11 11 0 0 0 3.5.56 1 1 0 0 1 1 1V22a1 1 0 0 1-1 1C9.4 23 1 14.6 1 4a1 1 0 0 1 1-1h3.68a1 1 0 0 1 1 1 11 11 0 0 0 .56 3.5 1 1 0 0 1-.24 1L5.5 10" />
      <path d="m23 1-6 6" />
      <path d="m17 1 6 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 15V3" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function loadDailyScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.DailyIframe) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-daily="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Daily SDKの読み込みに失敗しました")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js";
    script.async = true;
    script.dataset.daily = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Daily SDKの読み込みに失敗しました"));
    document.body.appendChild(script);
  });
}

export default function VideoCallPage({ params }: { params: { id: string } }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef<DailyCallFrame | null>(null);

  const [session, setSession] = useState<DailySessionPayload | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");
  const [quickViewFile, setQuickViewFile] = useState<QuickViewFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("ユニブリ User");
  const [currentUserRole, setCurrentUserRole] = useState("student");
  const [canManage, setCanManage] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [connectionState, setConnectionState] = useState<"idle" | "joining" | "joined" | "left" | "error">("idle");
  const [participantCount, setParticipantCount] = useState(0);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const authHeader = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabaseが初期化されていません");
    const { data } = await supabase.auth.getSession();
    const authSession = data.session;
    if (!authSession) throw new Error("ログインが必要です");
    setCurrentUserId(authSession.user.id);
    setCurrentUserName(authSession.user.user_metadata?.full_name || authSession.user.email || "ユニブリ User");
    return { Authorization: `Bearer ${authSession.access_token}` };
  };

  const appendEvent = (event: CallEvent) => setEvents((prev) => [event, ...prev].slice(0, 50));

  const saveEvent = async (eventType: string, metadata: Record<string, unknown> = {}) => {
    const headers = await authHeader();
    const res = await fetch(`/api/calls/${params.id}/event`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, metadata })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error ?? "通話イベントの保存に失敗しました");
    if (payload.event) appendEvent(payload.event as CallEvent);
  };

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        setLoading(true);
        const headers = await authHeader();
        const res = await fetch(`/api/calls/${params.id}/daily`, { method: "POST", headers });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error ?? "通話情報の取得に失敗しました");
        if (disposed) return;
        setProviderUnavailable(false);
        setSession(payload as DailySessionPayload);
        setParticipants((payload.participants ?? []) as Participant[]);
        setEvents((payload.events ?? []) as CallEvent[]);
        setCanManage(Boolean(payload.canManage));
        setRecording(payload.session?.recordingStatus === "recording");
        setCurrentUserRole(payload.role ?? "student");
      } catch (e) {
        const message = sanitizeVideoCallError(e instanceof Error ? e.message : "通話情報の取得に失敗しました");
        setError(message);
        if (message.includes("現在ビデオ通話機能は利用できません")) setProviderUnavailable(true);
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [params.id]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentUserId) return;
    let active = true;

    const loadMessages = async () => {
      const { data: rows } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, expires_at, deleted_at")
        .eq("request_id", params.id)
        .order("created_at", { ascending: true });
      if (!active) return;
      const visibleRows = (rows ?? []).filter((row: { expires_at?: string | null; deleted_at?: string | null }) => {
        if (row.deleted_at) return false;
        if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
        return true;
      });
      const senderIds = Array.from(new Set(visibleRows.map((row) => row.sender_id)));
      const { data: profiles } = senderIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", senderIds)
        : { data: [] as Array<{ id: string; full_name: string }> };
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
      setMessages(
        visibleRows.map((row) => ({
          ...parseMessageContent(row.content),
          id: row.id,
          senderId: row.sender_id,
          senderName: profileMap.get(row.sender_id) || "ユニブリ User",
          createdAt: row.created_at
        }))
      );
    };

    void loadMessages();

    const channel = supabase
      .channel(`call-messages-${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${params.id}` },
        async (payload) => {
          const row = payload.new as {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
            expires_at?: string | null;
            deleted_at?: string | null;
          };
          if (row.deleted_at) return;
          if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return;
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", row.sender_id).single();
          if (!active) return;
          const parsed = parseMessageContent(row.content);
          setMessages((prev) =>
            prev.some((message) => message.id === row.id)
              ? prev
              : [...prev, { ...parsed, id: row.id, senderId: row.sender_id, senderName: profile?.full_name || "ユニブリ User", createdAt: row.created_at }]
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [params.id, currentUserId]);

  useEffect(() => {
    return () => {
      sharedFiles.forEach((file) => URL.revokeObjectURL(file.url));
      try {
        frameRef.current?.destroy();
      } catch {}
    };
  }, [sharedFiles]);


  useEffect(() => {
    if (!session || !containerRef.current || frameRef.current) return;
    let disposed = false;
    let watchdog: number | null = null;

    const init = async () => {
      try {
        setJoining(true);
        setConnectionState("joining");
        setProviderUnavailable(false);
        await loadDailyScript();
        if (disposed || !containerRef.current || !window.DailyIframe) return;

        const frame = window.DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            backgroundColor: "#0f172a"
          },
          showLeaveButton: false,
          showFullscreenButton: false,
          showLocalVideo: true,
          activeSpeakerMode: true,
          lang: "jp"
        });
        frameRef.current = frame;
        const iframe = containerRef.current.querySelector("iframe");
        if (iframe) iframe.setAttribute("allow", "camera; microphone; autoplay; display-capture; clipboard-write; fullscreen");

        const syncParticipantCount = () => {
          const count = participants.length || 1;
          setParticipantCount(count);
        };

        frame.on("joined-meeting", async () => {
          setJoined(true);
          setJoining(false);
          setConnectionState("joined");
          setProviderUnavailable(false);
          if (watchdog) window.clearTimeout(watchdog);
          syncParticipantCount();
          try {
            await saveEvent("joined", { provider: "daily" });
          } catch {}
        });
        frame.on("left-meeting", () => {
          setJoined(false);
          setConnectionState("left");
          setJoining(false);
        });
        frame.on("participant-joined", async () => {
          setNotice("参加者が通話に参加しました。");
          setJoined(true);
          syncParticipantCount();
          try { await saveEvent("participant_joined", { provider: "daily" }); } catch {}
        });
        frame.on("participant-left", async () => {
          setNotice("参加者が通話から退出しました。");
          syncParticipantCount();
          try { await saveEvent("participant_left", { provider: "daily" }); } catch {}
        });
        frame.on("recording-started", () => setRecording(true));
        frame.on("recording-stopped", () => setRecording(false));
        frame.on("error", (ev) => {
          const message = sanitizeVideoCallError(ev?.errorMsg || "ビデオ通話機能の初期化に失敗しました");
          setError(message);
          setJoining(false);
          setConnectionState("error");
          if (message.includes("現在ビデオ通話機能は利用できません")) setProviderUnavailable(true);
          if (watchdog) window.clearTimeout(watchdog);
        });

        watchdog = window.setTimeout(() => {
          setJoining(false);
          setNotice("接続に時間がかかっています。画面が変わらない場合は再接続を押してください。");
        }, 8000);

        void frame.join({
          url: session.roomUrl,
          token: session.token,
          userName: currentUserName,
          startVideoOff: false,
          startAudioOff: false
        }).catch((e: unknown) => {
          const message = sanitizeVideoCallError(e instanceof Error ? e.message : "ビデオ通話機能の初期化に失敗しました");
          setError(message);
          setJoining(false);
          setConnectionState("error");
          if (message.includes("現在ビデオ通話機能は利用できません")) setProviderUnavailable(true);
          if (watchdog) window.clearTimeout(watchdog);
        });
      } catch (e) {
        const message = sanitizeVideoCallError(e instanceof Error ? e.message : "ビデオ通話機能の初期化に失敗しました");
        setError(message);
        setJoining(false);
        setConnectionState("error");
        if (message.includes("現在ビデオ通話機能は利用できません")) setProviderUnavailable(true);
      }
    };

    void init();
    return () => {
      disposed = true;
      if (watchdog) window.clearTimeout(watchdog);
    };
  }, [session]);

  useEffect(() => {
    if (connectionState !== "joined") return;
    const timer = window.setInterval(() => setCallSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [connectionState]);
  const endCall = async () => {
    try {
      await frameRef.current?.leave();
      await saveEvent("session_ended", { provider: "daily" });
      setJoined(false);
      setConnectionState("left");
      const headers = await authHeader();
      await fetch(`/api/calls/${params.id}/leave`, { method: "POST", headers });
    } catch (e) {
      setError(e instanceof Error ? e.message : "通話終了に失敗しました");
    }
  };

  const copyRoomUrl = async () => {
    if (!session?.roomUrl) return;
    try {
      await navigator.clipboard.writeText(session.roomUrl);
      setNotice("通話URLをコピーしました。");
    } catch {
      setError("URLのコピーに失敗しました");
    }
  };

  const retryJoin = async () => {
    try {
      setError(null);
      setProviderUnavailable(false);
      setJoining(true);
      await frameRef.current?.leave().catch(() => undefined);
      if (!session) return;
      await frameRef.current?.join({ url: session.roomUrl, token: session.token, userName: currentUserName });
    } catch (e) {
      const message = sanitizeVideoCallError(e instanceof Error ? e.message : "再接続に失敗しました");
      setError(message);
      if (message.includes("現在ビデオ通話機能は利用できません")) setProviderUnavailable(true);
      setJoining(false);
      setConnectionState("error");
    }
  };

  const sendChatMessage = async () => {
    const value = chatInput.trim();
    if (!value) return;
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { error: insertError } = await supabase.from("messages").insert({ request_id: params.id, sender_id: currentUserId, content: value });
      if (insertError) throw insertError;
      setChatInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "メッセージ送信に失敗しました");
    }
  };

  const uploadAttachment = async (file: File) => {
    const headers = await authHeader();
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/calls/${params.id}/attachments`, {
      method: "POST",
      headers,
      body: form
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error ?? "ファイルのアップロードに失敗しました");
    return payload.file as {
      name: string;
      mimeType: string;
      size: number;
      sizeLabel: string;
      url: string;
      path: string;
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFile(true);
      const uploaded = await uploadAttachment(file);
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");

      const payload = JSON.stringify({
        kind: "file",
        file: {
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          path: uploaded.path,
          url: uploaded.url
        }
      });

      const { error: insertError } = await supabase.from("messages").insert({
        request_id: params.id,
        sender_id: currentUserId,
        content: payload
      });
      if (insertError) throw insertError;

      const item: SharedFile = {
        id: crypto.randomUUID(),
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        sizeLabel: uploaded.sizeLabel,
        url: uploaded.url,
        uploadedBy: currentUserName,
        createdAt: new Date().toISOString()
      };
      setSharedFiles((prev) => [item, ...prev.filter((prevItem) => prevItem.url !== item.url)]);
      setSidebarTab("chat");
      setNotice(`${uploaded.name} を送信しました。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ファイル送信に失敗しました");
    } finally {
      setUploadingFile(false);
      event.target.value = "";
    }
  };

  const sessionTitle = useMemo(() => {
    if (participants.length >= 2) return `ユニブリ Consultation - ${participants.map((participant) => participant.name).join(" & ")}`;
    return "ユニブリ Consultation";
  }, [participants]);

  useEffect(() => {
    const files = messages
      .filter((message): message is ChatMessage & { file: NonNullable<ChatMessage["file"]> } => message.kind === "file" && Boolean(message.file))
      .map((message) => ({
        id: message.id,
        name: message.file!.name,
        mimeType: message.file!.mimeType,
        size: message.file!.size,
        sizeLabel: formatFileSize(message.file!.size),
        url: message.file!.url,
        uploadedBy: message.senderName,
        createdAt: message.createdAt
      }));
    setSharedFiles(files);
  }, [messages]);

  return (
    <div className="ao-call-shell h-full w-full overflow-hidden bg-slate-100 text-slate-900">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
      <div className="grid h-full grid-cols-[280px_minmax(0,1fr)_290px] xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h1 className="text-xl font-bold">ビデオ通話</h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">参加前チェック完了後に通話へ参加してください。</p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ルームID</p>
              <p className="mt-2 break-all text-base font-semibold">{session?.roomName ?? `ao-match-${params.id}`}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/chat?requestId=${params.id}`} className="inline-flex items-center rounded-xl bg-[#00B884] px-3 py-2 text-xs font-semibold text-white hover:bg-[#009d70]">チャットに戻る</Link>
                <ReportDialog reportType="call" requestId={params.id} triggerLabel="通報" triggerClassName="inline-flex items-center rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-lg font-semibold">参加方法</h2>
              <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                中央の通話エリアで Daily の参加前チェックが表示されます。
                <br />
                Chrome で権限が出ない場合は、URL バー左のサイト設定でカメラとマイクを許可してください。
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={retryJoin} className="rounded-xl bg-[#00B884] px-3 py-2 text-xs font-semibold text-white hover:bg-[#009d70]">接続を再試行</button>
                <button type="button" onClick={copyRoomUrl} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">URLをコピー</button>
              </div>
            </div>
            <div className="min-h-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">参加者</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">{canManage ? "管理者" : "参加者"}</span>
              </div>
              <div className="mt-2 space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    {participant.avatarUrl ? <img src={participant.avatarUrl} alt={participant.name} className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-700">{participant.name.slice(0, 1)}</div>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{participant.name}</p>
                      <p className="text-[11px] text-slate-500">{participant.role === "tutor" ? "大学生メンター" : "高校生"}{participant.school ? `・${participant.school}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex h-full min-w-0 flex-col bg-slate-100">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{sessionTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">Daily 製品版通話ルームです。</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {recording ? <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-600">REC</span> : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-slate-700">{formatClock(callSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{providerUnavailable ? "現在ビデオ通話機能は利用できません。時間を空けて再度お試しください。" : error}</div> : null}
            {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{notice}</div> : null}

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={cn("rounded-full px-3 py-1", joined ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>接続: {connectionState}</span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">参加人数: {participantCount}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-2xl">
              {providerUnavailable ? (
                <div className="grid h-full place-items-center text-center text-white">
                  <div>
                    <p className="text-2xl font-bold">現在ビデオ通話機能は利用できません</p>
                    <p className="mt-3 text-sm text-white/70">管理者側の通話設定が完了していない可能性があります。しばらくしてから再度お試しください。</p>
                  </div>
                </div>
              ) : (
                <div ref={containerRef} className="h-full w-full" />
              )}
            </div>

            {joined ? (
              <div className="mt-4 flex items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
                <button type="button" onClick={endCall} className="inline-flex items-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"><PhoneOffIcon /><span className="ml-2">通話終了</span></button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex h-full flex-col border-l border-slate-200 bg-slate-900 text-white">
          <div className="flex border-b border-slate-700 text-xs font-bold">
            <button type="button" onClick={() => setSidebarTab("chat")} className={cn("flex-1 py-4", sidebarTab === "chat" ? "border-b-2 border-emerald text-white" : "text-slate-400 hover:text-white")}>CHAT</button>
            <button type="button" onClick={() => setSidebarTab("people")} className={cn("flex-1 py-4", sidebarTab === "people" ? "border-b-2 border-emerald text-white" : "text-slate-400 hover:text-white")}>PEOPLE</button>
            <button type="button" onClick={() => setSidebarTab("files")} className={cn("flex-1 py-4", sidebarTab === "files" ? "border-b-2 border-emerald text-white" : "text-slate-400 hover:text-white")}>FILES</button>
          </div>

          {sidebarTab === "chat" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? <p className="text-sm text-slate-500">まだメッセージはありません。</p> : messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  return (
                    <div key={message.id} className={cn("space-y-1", mine && "text-right")}>
                      <div className={cn("flex items-center gap-2 text-[10px]", mine ? "justify-end" : "justify-start")}>
                        {!mine ? <span className="font-bold text-emerald">{message.senderName}</span> : null}
                        <span className="text-slate-500">{new Date(message.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine ? <span className="font-bold text-slate-300">{message.senderName} (You)</span> : null}
                      </div>
                      {message.kind === "file" && message.file ? (
                        <div className={cn("w-full max-w-[92%] rounded-2xl p-3 text-left", mine ? "ml-auto bg-emerald text-white" : "bg-slate-700 text-slate-100")}>
                          <div className="flex items-start gap-3">
                            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold", mine ? "bg-white/20 text-white" : "bg-slate-600 text-slate-200")}>
                              {message.file.mimeType.startsWith("image/") ? "IMG" : message.file.mimeType === "application/pdf" ? "PDF" : "FILE"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{message.file.name}</p>
                              <p className={cn("mt-0.5 text-[11px]", mine ? "text-emerald-50/90" : "text-slate-300")}>{formatFileSize(message.file.size)}</p>
                            </div>
                          </div>
                          <div className={cn("mt-3 flex flex-wrap gap-2", mine ? "justify-end" : "justify-start")}>
                            {isPreviewable(message.file) ? (
                              <button type="button" onClick={() => setQuickViewFile(message.file ?? null)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", mine ? "bg-white/20 text-white" : "bg-slate-600 text-slate-100")}>
                                クイックビュー
                              </button>
                            ) : null}
                            <a href={message.file.url} download={message.file.name} target="_blank" rel="noreferrer" className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", mine ? "bg-white/20 text-white" : "bg-slate-600 text-slate-100")}>
                              開く
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className={cn("inline-block max-w-[92%] rounded-tl-xl rounded-tr-xl p-3 text-left text-sm leading-relaxed", mine ? "rounded-bl-xl bg-emerald text-white" : "rounded-br-xl bg-slate-700 text-slate-200")}>{message.content}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-700 bg-slate-800 p-3">
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  <button type="button" className="p-1 text-slate-500 hover:text-emerald" onClick={() => fileInputRef.current?.click()}><PlusIcon /></button>
                  <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void sendChatMessage(); } }} className="w-full border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-0" placeholder="Message..." type="text" />
                  <button type="button" className="p-1 text-emerald" onClick={() => void sendChatMessage()}><SendIcon /></button>
                </div>
                {uploadingFile ? <p className="mt-2 text-xs text-emerald-400">ファイルをアップロード中です...</p> : <p className="mt-2 text-xs text-slate-500">画像・PDF・各種ファイルを送信できます。</p>}
              </div>
            </div>
          ) : null}

          {sidebarTab === "people" ? (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {participants.map((participant) => (
                <div key={participant.id} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-3">
                    {participant.avatarUrl ? <img src={participant.avatarUrl} alt={participant.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald/20 font-semibold text-emerald">{participant.name.slice(0, 1)}</div>}
                    <div>
                      <p className="font-semibold text-white">{participant.name}</p>
                      <p className="text-xs text-slate-400">{participant.role === "tutor" ? "大学生メンター" : "高校生"}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">{participant.school || "ユニブリ 参加ユーザー"}</div>
                </div>
              ))}
            </div>
          ) : null}

          {sidebarTab === "files" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {sharedFiles.length === 0 ? <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">まだ共有ファイルはありません。</div> : sharedFiles.map((file) => (
                  <div key={file.id} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">FILE</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{file.sizeLabel} • {file.uploadedBy}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPreviewable(file) ? <button type="button" onClick={() => setQuickViewFile(file)} className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">表示</button> : null}
                        <a href={file.url} download={file.name} className="rounded-lg p-2 text-slate-400 hover:bg-slate-700"><DownloadIcon /></a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700 bg-slate-900/30 p-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-2xl bg-[#00B884] px-4 py-3 text-sm font-semibold text-white hover:bg-[#009d70]">ファイルを追加</button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
      {quickViewFile ? (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/70 p-8">
          <div className="flex h-full max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{quickViewFile.name}</h3>
                <p className="text-sm text-slate-500">{formatFileSize(quickViewFile.size)}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={quickViewFile.url} target="_blank" rel="noreferrer" download={quickViewFile.name} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">ダウンロード</a>
                <button type="button" onClick={() => setQuickViewFile(null)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">閉じる</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-4">
              {quickViewFile.mimeType.startsWith("image/") ? (
                <img src={quickViewFile.url} alt={quickViewFile.name} className="h-full w-full rounded-2xl object-contain bg-white" />
              ) : quickViewFile.mimeType === "application/pdf" ? (
                <iframe src={quickViewFile.url} className="h-full w-full rounded-2xl bg-white" />
              ) : quickViewFile.mimeType.startsWith("text/") ? (
                <iframe src={quickViewFile.url} className="h-full w-full rounded-2xl bg-white" />
              ) : (
                <div className="grid h-full place-items-center rounded-2xl bg-white text-center text-slate-500">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">プレビュー非対応ファイルです</p>
                    <p className="mt-2 text-sm">ダウンロードして内容を確認してください。</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
