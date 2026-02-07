"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const [message, setMessage] = useState("決済情報を取得中...");

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      if (!sessionId) {
        setMessage("決済情報が見つかりません");
        return;
      }
      const response = await fetch("/api/stripe/demo-session-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (!response.ok) {
        setMessage("決済情報の取得に失敗しました");
        return;
      }
      const data = await response.json();
      const saved = window.localStorage.getItem("demo-request");
      if (saved) {
        const request = JSON.parse(saved);
        request.status = "escrowed";
        request.paymentIntentId = data.paymentIntentId ?? "";
        window.localStorage.setItem("demo-request", JSON.stringify(request));
      }
      setMessage("支払いが完了しました。デモ画面に戻ってください。");
    };
    load();
  }, []);

  return (
    <div className="card p-8 grid gap-4">
      <h1 className="text-2xl font-semibold text-sea">支払い完了（テスト）</h1>
      <p className="text-sea/80">{message}</p>
      <Link className="btn btn-primary" href="/demo">デモ画面へ戻る</Link>
    </div>
  );
}
