"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface RequestMeta {
  status: string;
  requester_id: string;
  tutor_id: string | null;
}

export default function ChatPage() {
  const params = useParams();
  const requestId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [requestMeta, setRequestMeta] = useState<RequestMeta | null>(null);
  const [isOnlineMethod, setIsOnlineMethod] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      setUserId(sessionData.session?.user.id ?? null);

      const { data: req } = await supabase
        .from("requests")
        .select("status, requester_id, tutor_id")
        .eq("id", requestId)
        .maybeSingle();
      setRequestMeta((req as RequestMeta | null) ?? null);

      const { data: detail } = await supabase
        .from("request_details")
        .select("support_method")
        .eq("request_id", requestId)
        .maybeSingle();
      setIsOnlineMethod(Boolean(detail?.support_method?.includes("オンライン")));

      const { data } = await supabase
        .from("messages")
        .select("id, request_id, sender_id, content, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) ?? []);
    };
    load();

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`messages-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const canChat = requestMeta ? ["escrowed", "completed"].includes(requestMeta.status) : false;
  const participantAllowed =
    requestMeta && userId ? userId === requestMeta.requester_id || userId === requestMeta.tutor_id : false;

  const sendMessage = async () => {
    if (!content.trim() || !userId || !canChat || !participantAllowed) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: userId,
      content
    });
    setContent("");
  };

  if (!requestMeta) {
    return <p className="text-sea">読み込み中...</p>;
  }

  if (!participantAllowed) {
    return <p className="text-accent">このチャットにアクセスする権限がありません。</p>;
  }

  if (!canChat) {
    return <p className="text-sea">決済確認後にチャットが開放されます。</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-sea">チャット</h2>
          {isOnlineMethod && (
            <button className="btn btn-secondary" disabled>
              ビデオ通話（次フェーズ）
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] ${
                message.sender_id === userId
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-cloud border border-sand text-sea"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>
      </div>
      <div className="card p-4 flex gap-3">
        <input className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="メッセージ" />
        <button className="btn btn-primary" onClick={sendMessage}>
          送信
        </button>
      </div>
    </div>
  );
}
