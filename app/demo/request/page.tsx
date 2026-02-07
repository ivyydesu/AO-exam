"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const monthlySales = [
  { month: "9月", value: 98000 },
  { month: "10月", value: 124000 },
  { month: "11月", value: 156000 },
  { month: "12月", value: 173000 },
  { month: "1月", value: 189000 }
];

const recentReviews = [
  { id: "rv-1", name: "高3・文系", rating: 5, text: "志望理由書の流れが一気に整理できた。" },
  { id: "rv-2", name: "高2・理系", rating: 4, text: "面接練習が実戦的で助かった。" },
  { id: "rv-3", name: "高3・SFC", rating: 5, text: "探究テーマの深掘りがうまい。" }
];

const tasks = [
  { id: "t1", title: "志望理由書の添削", status: "対応中", due: "2/10" },
  { id: "t2", title: "面接練習 60分", status: "今日", due: "2/7" },
  { id: "t3", title: "自己PRの構成", status: "未着手", due: "2/15" }
];

export default function DemoRequestPage() {
  const [request, setRequest] = useState<any>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("demo-request");
    if (saved) {
      setRequest(JSON.parse(saved));
    }
  }, []);

  const acceptRequest = () => {
    const next = { ...request, status: "accepted" };
    window.localStorage.setItem("demo-request", JSON.stringify(next));
    setRequest(next);
  };

  const markPaid = () => {
    const chatId = request.chatId || crypto.randomUUID();
    const next = { ...request, status: "escrowed", chatId };
    window.localStorage.setItem("demo-request", JSON.stringify(next));
    setRequest(next);
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">Tutor Dashboard</p>
          <h1 className="text-3xl font-display font-semibold text-ink">大学生 管理画面</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary" href="/demo">高校生画面</Link>
          <Link className="btn btn-secondary" href="/demo/admin">運営画面</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-sea/60">今月の売上</p>
          <p className="text-2xl font-semibold text-sea">¥189,000</p>
          <p className="text-xs text-sea/60">前月比 +9%</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-sea/60">平均評価</p>
          <p className="text-2xl font-semibold text-accent">★ 4.8</p>
          <p className="text-xs text-sea/60">レビュー 42件</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-sea/60">対応中の依頼</p>
          <p className="text-2xl font-semibold text-sea">6件</p>
          <p className="text-xs text-sea/60">今日締切 1件</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2 grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-sea">月別売上</h2>
            <span className="text-sm text-sea/60">過去5ヶ月</span>
          </div>
          <div className="grid gap-3">
            {monthlySales.map((item) => (
              <div key={item.month} className="flex items-center gap-3">
                <span className="w-10 text-sm text-sea/70">{item.month}</span>
                <div className="h-2 flex-1 rounded-full bg-sand/60">
                  <div
                    className="h-2 rounded-full bg-sea"
                    style={{ width: `${Math.min(item.value / 2000, 100)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm text-sea/70">¥{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 grid gap-3">
          <h2 className="text-xl font-semibold text-sea">最近のレビュー</h2>
          {recentReviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-sand bg-white/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-sea">{review.name}</p>
                <span className="text-sm text-accent">★ {review.rating}</span>
              </div>
              <p className="mt-2 text-sm text-sea/80">{review.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6 grid gap-4">
          <h2 className="text-xl font-semibold text-sea">受注リクエスト</h2>
          {request ? (
            <div className="grid gap-2 text-sm text-sea/70">
              <p>依頼タイトル: {request.title || "-"}</p>
              <p>内容: {request.description || "-"}</p>
              <p>予算: ¥{Number(request.budget ?? 0).toLocaleString()}</p>
              <p>ステータス: {request.status}</p>
            </div>
          ) : (
            <p className="text-sm text-sea/70">依頼がまだありません。</p>
          )}
          <button className="btn btn-primary w-fit" onClick={acceptRequest} disabled={!request || request.status !== "draft"}>
            受注する
          </button>
          <button className="btn btn-secondary w-fit" onClick={markPaid} disabled={!request || request.status !== "accepted"}>
            支払い完了
          </button>
          <p className="text-xs text-sea/60">受注後は高校生側で支払いに進みます。</p>
        </div>

        <div className="card p-6 grid gap-4">
          <h2 className="text-xl font-semibold text-sea">今日のタスク</h2>
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-sand bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-sea">{task.title}</p>
                  <span className="text-xs text-sea/60">{task.due}</span>
                </div>
                <p className="text-xs text-sea/60">{task.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
