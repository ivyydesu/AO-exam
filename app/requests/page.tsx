"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase/client";

interface RequestRow {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
  requester_id: string;
  requester_name: string | null;
}

export default function RequestsPage() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("requests_with_profile")
        .select("id, title, description, budget, status, created_at, requester_id, requester_name")
        .order("created_at", { ascending: false });
      setItems((data as RequestRow[]) ?? []);
    };
    load();
  }, []);

  const filtered = items.filter((item) =>
    [item.title, item.description, item.requester_name ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-sea">依頼一覧</h2>
        <Link className="btn btn-primary" href="/requests/new">依頼を作成</Link>
      </div>
      <input
        className="input"
        placeholder="キーワード検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid gap-4">
        {filtered.map((item) => (
          <Link key={item.id} href={`/requests/${item.id}`} className="card p-5 hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-sea">{item.title}</h3>
              <span className="text-sm text-sea/70">{item.status}</span>
            </div>
            <p className="mt-2 text-sm text-sea/80">{item.description}</p>
            <div className="mt-3 flex items-center justify-between text-sm text-sea/70">
              <span>依頼者: {item.requester_name ?? "-"}</span>
              <span>予算: ¥{item.budget.toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
