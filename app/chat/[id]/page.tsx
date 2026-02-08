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

export default function ChatPage() {
  const params = useParams();
  const requestId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      setUserId(sessionData.session?.user.id ?? null);
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

  const sendMessage = async () => {
    if (!content.trim() || !userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: userId,
      content
    });
    setContent("");
  };

  return (
    <div className="grid gap-4">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold text-sea">チャット</h2>
        <div className="mt-4 grid gap-3">
          {messages.map((message) => (
            <div key={message.id} className={`rounded-xl px-4 py-2 text-sm ${message.sender_id === userId ? "bg-accent text-white" : "bg-white border border-sand text-sea"}`}>
              {message.content}
            </div>
          ))}
        </div>
      </div>
      <div className="card p-4 flex gap-3">
        <input className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="メッセージ" />
        <button className="btn btn-primary" onClick={sendMessage}>送信</button>
      </div>
    </div>
  );
}
