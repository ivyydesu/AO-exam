"use client";

import Link from "next/link";

const favorites = [
  { id: "fav-1", title: "志望理由書の添削", count: 0 }
];

export default function FavoritesPage() {
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
      </header>

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="card p-6 text-sm text-sea/70">
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-full bg-sand/70" />
            <p className="text-base font-semibold text-ink">kota0507</p>
            <button className="text-xs text-accent">プロフィール編集</button>
            <button className="text-xs text-accent">スケジュール編集</button>
          </div>
          <div className="mt-6 grid gap-2">
            {[
              "購入者ダッシュボード",
              "購入取引（トークルーム）/ 見積り",
              "募集管理",
              "購入ブログ",
              "お気に入り",
              "ポイント / クーポン"
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-cloud">
                <span>{item}</span>
                <span>›</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="card p-6">
          <h1 className="text-2xl font-semibold text-ink">お気に入り</h1>
          <div className="mt-6 flex border border-sand rounded-2xl overflow-hidden text-sm text-sea/70">
            {[
              { label: "サービス", active: true },
              { label: "ブログ" },
              { label: "ユーザー" }
            ].map((tab) => (
              <div
                key={tab.label}
                className={`flex-1 text-center py-3 ${tab.active ? "bg-white text-accent border-b-2 border-accent" : "bg-cloud"}`}
              >
                {tab.label}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            {favorites.map((fav) => (
              <div key={fav.id} className="rounded-2xl border border-sand bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-sand/60" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{fav.title}</p>
                    <p className="text-xs text-sea/60">お気に入り {fav.count}件</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
