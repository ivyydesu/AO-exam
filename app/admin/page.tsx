"use client";

import Link from "next/link";

function AdminCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <h2 className="text-xl font-bold text-[#111827]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{desc}</p>
      <p className="mt-5 text-sm font-semibold text-[#10B981]">開く →</p>
    </Link>
  );
}

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#111827]">運営管理画面</h1>
        <p className="mt-2 text-sm text-[#6B7280]">ホーム画面とは分離した運営専用の管理導線です。審査・通報対応をここで管理します。</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <AdminCard title="学生証審査" desc="大学生の学生証提出を確認し、承認・差し戻しを行います。" href="/admin/verifications" />
        <AdminCard title="通報管理" desc="ユーザー・取引・通話に関する通報を一覧確認し、対応状況を更新します。" href="/admin/reports" />
        <AdminCard title="ユーザー管理" desc="アカウント停止、本人確認状況、利用状態を確認・制御します。" href="/admin/users" />
        <AdminCard title="メッセージ審査" desc="メッセージ通報に絞って審査する管理導線です。" href="/admin/reports?reportType=message" />
        <AdminCard title="チャット監視" desc="運営が全ユーザー間のやり取りを監視・確認できる専用画面です。" href="/admin/chats" />
        <AdminCard title="決済手数料設定" desc="運営取り分(%)を管理します。Stripe決済時の手数料計算に反映されます。" href="/admin/stripe" />
        <AdminCard title="会社口座登録" desc="Stripeダッシュボードで会社の振込先口座（受取口座）を設定します。" href="/admin/payouts" />
      </div>
    </div>
  );
}
