"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClient, getVisitorId } from "../../lib/demoClient";
import DemoTopNav from "../../components/DemoTopNav";

type FavoriteItem = { id: string; title: string; tutor: string };

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;
    const id = getVisitorId();
    const load = async () => {
      const { data: favs } = await supabase.from("demo_favorites").select("service_id").eq("visitor_id", id);
      const { data: tutors } = await supabase.from("demo_tutors").select("id, name");
      const { data: services } = await supabase.from("demo_services").select("id, title, tutor_id");
      const tutorMap = new Map((tutors ?? []).map((t) => [t.id, t.name]));
      const serviceMap = new Map((services ?? []).map((s) => [s.id, s]));
      const rows = (favs ?? [])
        .map((f) => serviceMap.get(f.service_id))
        .filter(Boolean)
        .map((s: any) => ({ id: s.id, title: s.title, tutor: tutorMap.get(s.tutor_id) ?? "" }));
      setItems(rows);
    };
    load();
  }, []);
  return (
    <div className="grid gap-8">
      <DemoTopNav />

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
            {items.map((fav) => (
              <div key={fav.id} className="rounded-2xl border border-sand bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-sand/60" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{fav.title}</p>
                    <p className="text-xs text-sea/60">出品者: {fav.tutor}</p>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-sea/60">お気に入りはまだありません。</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
