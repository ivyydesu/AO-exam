"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BrandLogo from "../../components/BrandLogo";

export default function ContactPage() {
  const [category, setCategory] = useState("service");
  const [message, setMessage] = useState("");

  const count = useMemo(() => message.length, [message]);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#1f2937]">
      <nav className="sticky top-0 z-50 w-full border-b border-[#e5e7eb] bg-white py-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-12">
          <BrandLogo />
          <div className="hidden items-center gap-6 text-sm font-medium text-[#6b7280] md:flex">
            <Link className="transition-colors hover:text-[#00B884]" href="/demo">
              ホーム
            </Link>
            <span className="font-semibold text-[#00B884]">お問い合わせ</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 py-12 lg:grid-cols-12 lg:px-8">
        <section className="space-y-8 lg:col-span-5">
          <div className="space-y-4">
            <p className="text-sm font-bold uppercase tracking-wider text-[#00B884]">Contact</p>
            <h1 className="text-4xl font-bold md:text-5xl">お問い合わせ</h1>
            <p className="text-lg leading-relaxed text-[#6b7280]">
              ご質問・ご相談は下記フォームからお問い合わせください。
              <br />
              AO Matchチームが24時間以内に返信いたします。
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <h3 className="mb-2 text-lg font-bold">クイックサポート</h3>
            <Link href="/faq" className="flex items-center rounded-xl p-3 transition hover:bg-[#f9fafb]">
              <span className="mr-4 grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-600">?</span>
              <div>
                <p className="font-medium">よくある質問 (FAQ)</p>
                <p className="text-sm text-[#6b7280]">まずはここをチェック</p>
              </div>
            </Link>
            <a href="#" className="flex items-center rounded-xl p-3 transition hover:bg-[#f9fafb]">
              <span className="mr-4 grid h-10 w-10 place-items-center rounded-full bg-purple-100 text-purple-600">💬</span>
              <div>
                <p className="font-medium">チャットサポート</p>
                <p className="text-sm text-[#6b7280]">リアルタイムで相談</p>
              </div>
            </a>
            <Link href="/terms" className="flex items-center rounded-xl p-3 transition hover:bg-[#f9fafb]">
              <span className="mr-4 grid h-10 w-10 place-items-center rounded-full bg-orange-100 text-orange-600">📘</span>
              <div>
                <p className="font-medium">コミュニティガイドライン</p>
                <p className="text-sm text-[#6b7280]">ご利用のルールについて</p>
              </div>
            </Link>
          </div>
          <p className="text-sm text-[#6b7280]">support@aomatch.com</p>
        </section>

        <section className="lg:col-span-7">
          <form className="relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] md:p-10">
            <div className="space-y-7">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b7280]" htmlFor="name">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input id="name" className="w-full rounded-xl border-[#e5e7eb] bg-[#f9fafb] px-4 py-3" placeholder="AO Match 太郎" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b7280]" htmlFor="email">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input id="email" type="email" className="w-full rounded-xl border-[#e5e7eb] bg-[#f9fafb] px-4 py-3" placeholder="sample@example.com" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b7280]">お問い合わせ種別</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {[
                    { key: "service", label: "サービスについて" },
                    { key: "account", label: "アカウント関連" },
                    { key: "other", label: "その他" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCategory(item.key)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        category === item.key
                          ? "border-[#00B884] bg-[#00B884]/10 text-[#00B884]"
                          : "border-[#e5e7eb] bg-[#f9fafb] text-[#374151]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b7280]" htmlFor="message">
                  内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-y rounded-xl border-[#e5e7eb] bg-[#f9fafb] px-4 py-3"
                  placeholder="お問い合わせ内容をご記入ください"
                />
                <div className="mt-1 text-right text-xs text-[#6b7280]">{count} / 1000文字</div>
              </div>

              <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#e5e7eb] bg-[#f9fafb] p-6 text-center transition hover:border-[#00B884]/50">
                <input type="file" className="hidden" />
                <p className="text-sm font-medium">ファイルをアップロード</p>
                <p className="mt-1 text-xs text-[#6b7280]">PNG, JPG, PDF (最大 5MB)</p>
              </label>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00B884] px-6 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#009c70]"
              >
                <span>送信する (デモ)</span>
                <span>➤</span>
              </button>
            </div>
          </form>
          <p className="mt-6 text-center text-xs text-[#6b7280]">
            送信することで、
            <Link href="/privacy" className="text-[#00B884] hover:underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。
          </p>
        </section>
      </main>

      <footer className="mt-12 border-t border-[#e5e7eb] bg-white py-8">
        <div className="mx-auto w-full max-w-7xl px-6 text-center text-sm text-[#6b7280]">© 2024 AO Match. All rights reserved.</div>
      </footer>
    </div>
  );
}
