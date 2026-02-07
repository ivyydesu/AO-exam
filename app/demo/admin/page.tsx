import Link from "next/link";

const stats = [
  { label: "レビュー平均", value: "4.8" },
  { label: "今月の依頼", value: "38" },
  { label: "売上", value: "¥582,000" }
];

const requests = [
  { id: "REQ-1203", title: "志望理由書の添削", status: "審査中", tutor: "佐藤 亮太", budget: "¥15,000" },
  { id: "REQ-1202", title: "面接練習", status: "進行中", tutor: "山本 なお", budget: "¥18,000" },
  { id: "REQ-1201", title: "ポートフォリオ相談", status: "完了", tutor: "高橋 遼", budget: "¥20,000" }
];

export default function DemoAdminPage() {
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">Admin</p>
          <h1 className="text-3xl font-display font-semibold text-ink">依頼リクエスト</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-sand bg-white/80 px-4 py-3 text-sm">
              <p className="text-sea/60">{stat.label}</p>
              <p className="text-lg font-semibold text-sea">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="card p-6 grid gap-4">
        <h2 className="text-xl font-semibold text-sea">最新の依頼</h2>
        <div className="grid gap-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-sand bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-sea">{req.title}</p>
                  <p className="text-xs text-sea/60">{req.id} ・ 担当: {req.tutor}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-sea/60">{req.status}</p>
                  <p className="text-sm font-semibold text-sea">{req.budget}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-secondary" href="/demo">高校生画面</Link>
        <Link className="btn btn-secondary" href="/demo/request">大学生画面</Link>
      </div>
    </div>
  );
}
