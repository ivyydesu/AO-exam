"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

interface TutorRequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  requester_name: string | null;
  tutor_id: string | null;
  created_at: string;
}

export default function TutorRequestsPage() {
  const [items, setItems] = useState<TutorRequestItem[]>([]);
  const [tutorId, setTutorId] = useState<string>("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? "";
      setTutorId(uid);
      if (!uid) return;

      const { data } = await supabase
        .from("requests_with_profile")
        .select("id, title, description, status, budget, requester_name, tutor_id, created_at")
        .or(`tutor_id.is.null,tutor_id.eq.${uid}`)
        .order("created_at", { ascending: false });

      setItems((data as TutorRequestItem[]) ?? []);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === "draft" || (item.status === "accepted" && item.tutor_id === tutorId));
  }, [items, filter, tutorId]);

  return (
    <div className="grid gap-6">
      <div className="card p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-sea">大学生 承認/却下ダッシュボード</h2>
          <p className="text-sm text-sea/70 mt-1">新規依頼の承認・却下、進行案件の確認</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${filter === "pending" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("pending")}>
            承認待ち
          </button>
          <button className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("all")}>
            すべて
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((item) => (
          <Link key={item.id} href={`/requests/${item.id}`} className="card p-5 hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-sea">{item.title}</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-cloud text-sea">{item.status}</span>
            </div>
            <p className="mt-2 text-sm text-sea/75 line-clamp-2">{item.description}</p>
            <div className="mt-3 text-xs text-sea/70 flex flex-wrap gap-3">
              <span>依頼者: {item.requester_name ?? "-"}</span>
              <span>金額: ¥{item.budget.toLocaleString()}</span>
              <span>{item.tutor_id ? "あなた宛て" : "未アサイン"}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-sea/70">表示できる依頼がありません。</p>}
      </div>
    </div>
  );
}
