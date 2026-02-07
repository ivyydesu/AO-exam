"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function RequestNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(10000);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionUserId(data.session?.user.id ?? null);
    };
    load();
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!sessionUserId) {
      setError("ログインが必要です");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("requests")
      .insert({
        title,
        description,
        budget,
        requester_id: sessionUserId,
        status: "draft"
      })
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/requests/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-8">
        <h2 className="text-2xl font-semibold text-sea">依頼作成</h2>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="label">タイトル</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="label">内容</span>
            <textarea className="input h-32" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="label">予算（円）</span>
            <input
              className="input"
              type="number"
              min={1000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
            />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "作成中..." : "依頼を作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
