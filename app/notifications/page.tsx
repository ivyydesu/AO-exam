import Link from "next/link";

const notifications = [
  { id: "n1", title: "依頼が承認されました", body: "木戸洵成さんがあなたの依頼を承認しました。", time: "2分前" },
  { id: "n2", title: "新着チャット", body: "面談日時について新しいメッセージがあります。", time: "14分前" },
  { id: "n3", title: "支払いステータス更新", body: "依頼 No.1024 が支払い待ちに更新されました。", time: "1時間前" }
];

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-ink">通知センター</h1>
        <p className="mt-1 text-sm text-sea/70">最新の通知を確認できます。</p>
      </div>

      <div className="card p-4">
        <ul className="space-y-3">
          {notifications.map((item) => (
            <li key={item.id} className="rounded-xl border border-sand bg-cloud p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-sea/80">{item.body}</p>
                </div>
                <span className="shrink-0 text-xs text-sea/60">{item.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/home" className="btn btn-secondary w-fit">
        デモへ戻る
      </Link>
    </div>
  );
}
