"use client";

import { useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type Props = {
  reportType: "user" | "request" | "message" | "call" | "other";
  targetUserId?: string | null;
  requestId?: string | null;
  triggerLabel?: string;
  triggerClassName?: string;
};

const categories = [
  "迷惑行為",
  "暴言・ハラスメント",
  "不適切な提案",
  "なりすまし",
  "詐欺・金銭トラブル",
  "その他"
];

export default function ReportDialog({
  reportType,
  targetUserId = null,
  requestId = null,
  triggerLabel = "通報する",
  triggerClassName = "rounded-lg border border-[#FECACA] px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
}: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("ログインが必要です");
      if (!details.trim()) throw new Error("通報内容を入力してください");

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reportType,
          targetUserId,
          requestId,
          category,
          details
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "通報の送信に失敗しました");

      setSuccess("通報を受け付けました。運営が確認します。");
      setDetails("");
      setTimeout(() => setOpen(false), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "通報の送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#111827]">通報する</h3>
                <p className="mt-1 text-sm text-[#6B7280]">内容は運営にのみ共有されます。</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-[#6B7280] hover:bg-[#F9FAFB]">
                閉じる
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#111827]">カテゴリ</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-[#10B981]"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#111827]">詳細</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-[#10B981]"
                  placeholder="何が起きたか、いつ起きたかを具体的に入力してください。"
                />
              </label>

              {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
              {success ? <p className="text-sm text-[#047857]">{success}</p> : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm font-medium text-[#6B7280]">
                キャンセル
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "送信中..." : "通報を送信"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
