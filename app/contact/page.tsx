"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import BrandLogo from "../../components/BrandLogo";

type ContactCategory = "service" | "account" | "payment" | "other";

const categories: Array<{ key: ContactCategory; label: string }> = [
  { key: "service", label: "サービスについて" },
  { key: "account", label: "アカウント関連" },
  { key: "payment", label: "決済・料金" },
  { key: "other", label: "その他" }
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<ContactCategory>("service");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const count = useMemo(() => message.length, [message]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("必須項目を入力してください。");
      return;
    }
    if (message.length > 2000) {
      setError("本文は2000文字以内で入力してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          category,
          message
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "送信に失敗しました");
      }
      setNotice("お問い合わせを送信しました。通常24時間以内に運営よりご連絡します。");
      setSubject("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#111827]">
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-[420px_1fr]">
        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
          <BrandLogo size="sm" />
          <p className="mt-6 text-sm font-semibold tracking-[0.15em] text-[#10B981]">CONTACT</p>
          <h1 className="mt-2 text-3xl font-bold">お問い合わせ</h1>
          <p className="mt-4 text-sm leading-7 text-[#4B5563]">
            ご質問・ご相談を受け付けています。
            <br />
            送信内容は運営管理画面で受信し、順次対応します。
          </p>

          <div className="mt-8 space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-sm font-semibold text-[#111827]">よくある導線</p>
            <Link href="/faq" className="block text-sm text-[#10B981] hover:underline">
              よくある質問を見る
            </Link>
            <Link href="/terms" className="block text-sm text-[#10B981] hover:underline">
              利用規約を確認する
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
          <form className="grid gap-5" onSubmit={onSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">お名前 *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 outline-none focus:border-[#10B981]" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">メールアドレス *</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 outline-none focus:border-[#10B981]" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">件名 *</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 outline-none focus:border-[#10B981]" />
            </label>

            <div className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">お問い合わせ種別</span>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {categories.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item.key)}
                    className={`rounded-xl border px-3 py-2 text-sm ${category === item.key ? "border-[#10B981] bg-[#ECFDF5] text-[#047857]" : "border-[#E5E7EB] bg-white text-[#4B5563]"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">本文 *</span>
              <textarea
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-y rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 outline-none focus:border-[#10B981]"
                placeholder="お問い合わせ内容をご記入ください"
              />
              <span className="text-right text-xs text-[#6B7280]">{count}/2000</span>
            </label>

            {error ? <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-sm text-[#B91C1C]">{error}</p> : null}
            {notice ? <p className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2 text-sm text-[#047857]">{notice}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#10B981] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "送信中..." : "送信する"}
            </button>
          </form>
          <p className="mt-6 text-xs text-[#6B7280]">
            送信することで
            <Link href="/privacy" className="mx-1 text-[#10B981] hover:underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。
          </p>
        </section>
      </main>
    </div>
  );
}
