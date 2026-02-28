"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type VerificationItem = {
  id: string;
  user_id: string;
  full_name: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  admission_year: number | null;
  graduation_year: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
};

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const res = await fetch("/api/verification/admin/list", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "一覧取得に失敗しました");

      setItems(payload.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (userId: string, status: "approved" | "rejected") => {
    const reason =
      status === "rejected"
        ? window.prompt("差し戻し理由を入力してください", "画像不鮮明のため再提出をお願いします")
        : null;
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const res = await fetch("/api/verification/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ userId, status, reason })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "審査更新に失敗しました");

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    }
  };

  return (
    <div className="mx-auto max-w-6xl grid gap-6">
      <header className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">運営: 学生証審査管理</h1>
        <p className="text-sm text-sea/70 mt-2">学生証の承認/却下はこの画面のみで管理します。</p>
        <Link href="/admin" className="text-accent text-sm mt-3 inline-block">管理トップへ戻る</Link>
      </header>

      {error && <p className="text-sm text-accent">{error}</p>}
      {loading && <p className="text-sm text-sea">読み込み中...</p>}

      {!loading && (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="card p-5 grid gap-4 md:grid-cols-[420px_1fr]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-sand overflow-hidden bg-cloud">
                  {item.front_image_url ? (
                    <img src={item.front_image_url} alt={`${item.full_name} student id front`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-48 grid place-items-center text-xs text-sea/60">表面なし</div>
                  )}
                </div>
                <div className="rounded-xl border border-sand overflow-hidden bg-cloud">
                  {item.back_image_url ? (
                    <img src={item.back_image_url} alt={`${item.full_name} student id back`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-48 grid place-items-center text-xs text-sea/60">裏面なし</div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-base font-semibold text-ink">{item.full_name}</p>
                <p className="text-sm text-sea/70">user_id: {item.user_id}</p>
                <p className="text-sm text-sea/70">状態: {item.status}</p>
                <p className="text-sm text-sea/70">入学年度: {item.admission_year ?? "-"} / 卒業予定: {item.graduation_year ?? "-"}</p>
                <p className="text-sm text-sea/70">提出日: {new Date(item.created_at).toLocaleString()}</p>
                {item.reason && <p className="text-sm text-accent">差し戻し理由: {item.reason}</p>}
                <div className="flex gap-2 mt-2">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => review(item.user_id, "approved")}
                    disabled={item.status === "approved"}
                  >
                    承認
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => review(item.user_id, "rejected")}
                  >
                    差し戻し
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-sea/70">審査待ちデータはありません。</p>}
        </div>
      )}
    </div>
  );
}
