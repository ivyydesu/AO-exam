"use client";

import Link from "next/link";
import BrandLogo from "../../components/BrandLogo";

const cases = [
  {
    id: "C-1021",
    title: "志望理由書の添削を担当する方を募集",
    condition: "¥5千〜1.5万円",
    deadline: "2026/02/20",
    applicants: 12
  },
  {
    id: "C-1018",
    title: "面接練習（60分）で本番対策",
    condition: "¥8千〜2万円",
    deadline: "2026/02/18",
    applicants: 7
  }
];

export default function CasesPage() {
  return (
    <div className="grid gap-8">
      <header className="rounded-3xl bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-6 py-4">
          <BrandLogo textClassName="text-xl font-semibold text-ink" />
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2">
              <span className="text-xs text-sea/60">サービス</span>
              <input className="flex-1 bg-transparent text-sm outline-none" placeholder="キーワードで検索" />
              <button className="text-sm text-sea">検索</button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-sea/70">
            <Link href="/demo/request">取引管理</Link>
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
                  <Link href="/demo/request">注文履歴</Link>
                  <Link href="/favorites">お気に入り</Link>
                  <Link href="/settings">設定</Link>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <section className="card p-8">
        <h1 className="text-2xl font-semibold text-ink">案件管理</h1>
        <div className="mt-6 flex gap-6 border-b border-sand text-sm text-sea/70">
          <button className="pb-3 border-b-2 border-accent text-accent">単発・スポット</button>
          <button className="pb-3">継続（時給/月給）</button>
        </div>

        <div className="mt-6 grid gap-4">
          {cases.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand bg-white p-5">
              <div className="grid gap-2 md:grid-cols-[1fr_160px_140px_80px] md:items-center">
                <div>
                  <p className="text-sm text-sea/60">内容</p>
                  <p className="text-base font-semibold text-ink">{item.title}</p>
                </div>
                <div>
                  <p className="text-sm text-sea/60">募集条件</p>
                  <p className="text-sm text-ink">{item.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-sea/60">募集期限</p>
                  <p className="text-sm text-ink">{item.deadline}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-sea/60">応募数</p>
                  <p className="text-lg font-semibold text-ink">{item.applicants}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
