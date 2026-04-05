"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../lib/supabase/client";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  is_read: boolean;
  created_at: string;
};

function formatAbsoluteTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return formatAbsoluteTime(iso);
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase client unavailable");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setItems([]);
          return;
        }
        const res = await fetch("/api/notifications/list?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "通知の取得に失敗しました");
        setItems(json.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "通知の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const unreadCount = useMemo(() => items.filter((v) => !v.is_read).length, [items]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-ink">通知センター</h1>
        <p className="mt-1 text-sm text-sea/70">
          最新の通知を確認できます。未読 <span className="font-semibold text-[#DC2626]">{unreadCount}</span> 件
        </p>
      </div>

      <div className="card p-4">
        {loading ? <p className="px-2 py-4 text-sm text-sea/70">読み込み中...</p> : null}
        {error ? <p className="px-2 py-4 text-sm text-[#DC2626]">{error}</p> : null}
        {!loading && !error ? (
          <ul className="space-y-3">
            {items.length === 0 ? (
              <li className="rounded-xl border border-sand bg-cloud p-4 text-sm text-sea/70">通知はまだありません。</li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="rounded-xl border border-sand bg-cloud p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!item.is_read ? <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> : null}
                        <p className="font-semibold text-ink">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-sea/80">{item.body}</p>
                      {item.href ? (
                        <Link href={item.href} className="mt-2 inline-block text-xs font-semibold text-[#10B981] hover:underline">
                          関連ページを開く
                        </Link>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-sea/60">{formatRelativeTime(item.created_at)}</p>
                      <p className="mt-1 text-[11px] text-sea/50">{formatAbsoluteTime(item.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <Link href="/home" className="btn btn-secondary w-fit">
        戻る
      </Link>
    </div>
  );
}
