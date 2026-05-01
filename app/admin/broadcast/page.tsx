"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";

type TargetRole = "all" | "student" | "tutor";

const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
  all: "すべてのユーザー",
  student: "生徒のみ",
  tutor: "先輩メンターのみ"
};

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [targetRole, setTargetRole] = useState<TargetRole>("all");
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const getAuthHeader = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client is not initialized");

    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("ログインが必要です");

    return { Authorization: `Bearer ${data.session.access_token}` };
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedLink = link.trim();

    if (!trimmedTitle || !trimmedBody) {
      setErrorMessage("タイトルと本文は必須です。");
      return;
    }

    const targetLabel = TARGET_ROLE_LABELS[targetRole];
    const confirmed = window.confirm(`本当に【${targetLabel}】に送信しますか？`);
    if (!confirmed) return;

    setIsSending(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: trimmedTitle,
          body: trimmedBody,
          link: trimmedLink || null,
          targetRole
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "一斉送信に失敗しました");
      }

      setSuccessMessage(payload.message ?? "お知らせを送信しました。");
      setTitle("");
      setBody("");
      setLink("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "一斉送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">運営: お知らせ一斉送信</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              入力した内容を選択した送信先へ通知として送信します。送信前に最終確認が表示されます。
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
          >
            管理トップへ
          </Link>
        </div>

        {successMessage ? (
          <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">タイトル（必須）</span>
            <input
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: メンテナンスのお知らせ"
              className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2.5 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">本文（必須）</span>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="例: 5月10日 02:00-04:00にシステムメンテナンスを実施します。"
              className="w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">リンクURL（任意）</span>
            <input
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://example.com/news"
              className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2.5 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </label>

          <fieldset className="block">
            <legend className="mb-2 block text-sm font-semibold text-[#111827]">送信先</legend>
            <div className="space-y-2 rounded-xl border border-[#D1D5DB] p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827]">
                <input
                  type="radio"
                  name="targetRole"
                  value="all"
                  checked={targetRole === "all"}
                  onChange={() => setTargetRole("all")}
                  className="h-4 w-4 accent-[#10B981]"
                />
                すべてのユーザー
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827]">
                <input
                  type="radio"
                  name="targetRole"
                  value="student"
                  checked={targetRole === "student"}
                  onChange={() => setTargetRole("student")}
                  className="h-4 w-4 accent-[#10B981]"
                />
                生徒のみ
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827]">
                <input
                  type="radio"
                  name="targetRole"
                  value="tutor"
                  checked={targetRole === "tutor"}
                  onChange={() => setTargetRole("tutor")}
                  className="h-4 w-4 accent-[#10B981]"
                />
                先輩メンターのみ
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSending}
            className="rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0ea371] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "送信中..." : `${TARGET_ROLE_LABELS[targetRole]}に送信`}
          </button>
        </form>
      </div>
    </div>
  );
}
