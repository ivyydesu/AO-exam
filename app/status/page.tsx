"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const tabs = [
  "受付中",
  "見積り",
  "取引中",
  "完了",
  "キャンセル",
  "保存済み"
];

export default function StatusPage() {
  const [activeTab, setActiveTab] = useState("取引中");
  const [request, setRequest] = useState<any>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("demo-request");
    if (saved) {
      setRequest(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="grid gap-8">
      <header className="rounded-3xl bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent text-white grid place-items-center font-bold">AO</div>
            <p className="text-xl font-semibold text-ink">AO Match</p>
          </div>
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2">
              <span className="text-xs text-sea/60">サービス</span>
              <input className="flex-1 bg-transparent text-sm outline-none" placeholder="キーワードで検索" />
              <button className="text-sm text-sea">検索</button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-sea/70">
            <Link href="/status">取引管理</Link>
            <Link href="/cases">案件管理</Link>
            <Link href="/favorites">お気に入り</Link>
            <Link className="btn btn-secondary" href="/demo">サービスを探す</Link>
            <details className="relative">
              <summary className="list-none cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-sand/70 grid place-items-center text-xs">👤</div>
              </summary>
              <div className="absolute right-0 mt-3 w-56 rounded-xl border border-sand bg-white p-3 shadow-lg">
                <p className="text-sm font-semibold text-sea">kota0507</p>
                <div className="mt-2 grid gap-2 text-sm text-sea/70">
                  <Link href="/status">注文履歴</Link>
                  <Link href="/favorites">お気に入り</Link>
                  <Link href="/settings">設定</Link>
                </div>
              </div>
            </details>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 text-sm text-sea/70">
          <span>サービスを探す</span>
          <span>プロ人材を探す</span>
          <span>ノウハウ・素材を探す</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">NEW</span>
        </div>
      </header>

      <section className="card p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">取引管理（購入）</h1>
          <button className="text-sm text-sea/60">ゴミ箱</button>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 border-b border-sand text-sm text-sea/70">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`pb-3 ${activeTab === tab ? "border-b-2 border-accent text-accent" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6">
          {request ? (
            <div className="rounded-2xl border border-sand bg-white p-5">
              <div className="flex items-center justify-between text-sm text-sea/60">
                <span>最新の応募情報</span>
                <span>ステータス: {request.status}</span>
              </div>
              <p className="mt-3 text-base font-semibold text-ink">{request.title || "依頼タイトル未設定"}</p>
              <p className="mt-1 text-sm text-sea/70">予算: ¥{Number(request.budget ?? 0).toLocaleString()}</p>
              <p className="text-sm text-sea/70">担当予定: {request.tutorId}</p>
              <div className="mt-4 flex gap-2">
                <Link className="btn btn-primary" href="/demo">サービスを探す</Link>
                <Link className="btn border border-sea text-sea" href="/demo">詳細を見る</Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center text-sea/70">
              <div className="h-20 w-20 rounded-full bg-sand/60" />
              <p className="text-lg font-semibold text-ink">取引中のトークルームはありません</p>
              <p className="text-sm">気になる先輩を探して依頼してみましょう。</p>
              <Link className="btn btn-primary" href="/demo">サービスを探す</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
