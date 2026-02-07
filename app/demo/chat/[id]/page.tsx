"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Message {
  id: string;
  sender: "student" | "tutor";
  text: string;
  createdAt: string;
}

export default function DemoChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<"student" | "tutor">("student");

  useEffect(() => {
    const stored = window.localStorage.getItem(`demo-chat-${params.id}`);
    if (stored) {
      setMessages(JSON.parse(stored));
    }
  }, [params.id]);

  const send = () => {
    if (!input.trim()) return;
    const next: Message = {
      id: crypto.randomUUID(),
      sender: role,
      text: input,
      createdAt: new Date().toISOString()
    };
    const updated = [...messages, next];
    setMessages(updated);
    window.localStorage.setItem(`demo-chat-${params.id}`, JSON.stringify(updated));
    setInput("");
  };

  const createMeet = () => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(19, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const format = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "AO対策ミーティング",
      details: "高校生・大学生の面談（自動生成）",
      location: "Google Meet",
      dates: `${format(start)}/${format(end)}`
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
  };

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">Chat</p>
          <h1 className="text-3xl font-display font-semibold text-ink">チャットルーム</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary" href="/demo">高校生画面</Link>
          <Link className="btn btn-secondary" href="/demo/request">大学生画面</Link>
        </div>
      </header>

      <div className="card p-6 grid gap-3">
        <div className="flex flex-wrap gap-2">
          <button className={`btn ${role === "student" ? "btn-primary" : "btn-secondary"}`} onClick={() => setRole("student")}>
            高校生として送信
          </button>
          <button className={`btn ${role === "tutor" ? "btn-primary" : "btn-secondary"}`} onClick={() => setRole("tutor")}>
            大学生として送信
          </button>
          <button className="btn border border-sea text-sea" onClick={createMeet}>
            Google Meetを作成
          </button>
        </div>
        <div className="mt-2 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-sand bg-white/70 p-4">
          {messages.length === 0 && <p className="text-sm text-sea/60">まだメッセージがありません。</p>}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === role ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  message.sender === role
                    ? "bg-[#1E66FF] text-white"
                    : "bg-[#EAF1FF] text-sea"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="メッセージ" />
        <button className="btn btn-primary" onClick={send}>送信</button>
      </div>
    </div>
  );
}
