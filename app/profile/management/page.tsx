"use client";

import Link from "next/link";

function ToolRow({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] px-8 py-6 text-left transition hover:bg-[#F9FAFB]"
    >
      <div>
        <p className="text-lg font-semibold text-[#111827]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#6B7280]">{desc}</p>
      </div>
      <span className="text-xl text-[#9CA3AF]">→</span>
    </Link>
  );
}

export default function ProfileManagementPage() {
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="flex min-h-[calc(100dvh-81px)] overflow-hidden bg-[#F9FAFB] text-[#111827]">
        <aside className="w-20 shrink-0 border-r border-[#E5E7EB] bg-white/98 lg:w-64">
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-8">
              <Link href="/calendar" className="flex items-center rounded-lg p-3 text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#10B981]">
                <span className="text-[22px]">📅</span>
                <span className="ml-3 hidden lg:block">スケジュール</span>
              </Link>
              <Link href="/demo/request" className="flex items-center rounded-lg p-3 text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#10B981]">
                <span className="text-[22px]">📋</span>
                <span className="ml-3 hidden lg:block">申請状況</span>
              </Link>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB]/90 px-8 py-4 backdrop-blur-md">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#111827] md:text-4xl">管理ページ</h1>
              <p className="mt-1 text-sm text-[#6B7280]">主要な運用メニューへのショートカットです</p>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <ToolRow title="スケジュール" desc="予定と対応日をカレンダーで確認します。" href="/calendar" />
              <ToolRow title="申請状況の確認" desc="依頼の承認状況や進捗を確認します。" href="/demo/request" />
            </div>
            <p className="mt-8 text-center text-xs text-[#6B7280]/70">© 2024 AO Match. All rights reserved.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
