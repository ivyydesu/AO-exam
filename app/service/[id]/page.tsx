import Link from "next/link";

const makeAvatar = (skin: string, hair: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="24" fill="${skin}"/>
      <circle cx="80" cy="70" r="36" fill="#F7D7C4"/>
      <path d="M44 70c8-22 64-22 72 0v12H44z" fill="${hair}"/>
      <circle cx="68" cy="72" r="4" fill="#333"/>
      <circle cx="92" cy="72" r="4" fill="#333"/>
      <path d="M68 92c8 8 16 8 24 0" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`
  )}`;

const services = [
  {
    id: "tutor-1",
    title: "志望理由書をプロ目線で添削します",
    price: 15000,
    rating: 4.8,
    reviews: 42,
    sales: 120,
    tutor: "佐藤 亮太",
    university: "早稲田大学 政治経済学部",
    avatar: makeAvatar("#E6F0FF", "#2B3A67"),
    description:
      "AO対策の核となる志望理由書を、読み手の評価軸に合わせて磨きます。構成・表現・強みの打ち出し方まで伴走します。",
    delivery: "3日",
    flow: ["ヒアリング", "初稿提出", "修正フィードバック", "最終納品"],
    tags: ["志望理由書", "自己PR", "面接", "AO対策"],
    reviewsList: [
      { id: "rv-1", name: "yuma555", rating: 5, text: "提出直前でも間に合うように構成を整えてくれた。" },
      { id: "rv-2", name: "lupkaij", rating: 5, text: "短時間で改善ポイントが明確になった。" }
    ]
  },
  {
    id: "tutor-2",
    title: "SFC特化の探究テーマ設計を支援します",
    price: 18000,
    rating: 4.6,
    reviews: 30,
    sales: 86,
    tutor: "山本 なお",
    university: "慶應義塾大学 環境情報学部",
    avatar: makeAvatar("#FFF1E6", "#5C3A2E"),
    description:
      "SFCの評価軸に合わせた探究テーマを一緒に作り込みます。テーマ設定から仮説の立て方までサポート。",
    delivery: "5日",
    flow: ["ヒアリング", "テーマ設計", "仮説整理", "最終提出"],
    tags: ["探究", "SFC", "ポートフォリオ"],
    reviewsList: [
      { id: "rv-3", name: "yuaki111", rating: 5, text: "テーマが一気に深掘りできた。" }
    ]
  }
];

export default function ServicePage({ params }: { params: { id: string } }) {
  const service = services.find((item) => item.id === params.id) ?? services[0];

  return (
    <div className="grid gap-8">
      <header className="rounded-3xl bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent text-white grid place-items-center font-bold">AO</div>
            <p className="text-xl font-semibold text-ink">AO Match</p>
          </div>
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2">
              <span className="text-xs text-sea/60">サービス</span>
              <input className="flex-1 bg-transparent text-sm outline-none" placeholder="キーワードで検索" />
              <button className="text-sm text-sea">検索</button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-sea/70">
            <Link href="/status">取引管理</Link>
            <Link href="/cases">案件管理</Link>
            <Link href="/favorites">お気に入り</Link>
            <Link className="btn btn-secondary" href="/demo">サービスを探す</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <div className="card p-6">
            <p className="text-xs text-sea/60">サービス内容</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{service.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-sea/70">
              <span>評価 ★ {service.rating}</span>
              <span>レビュー {service.reviews}件</span>
              <span>販売実績 {service.sales}件</span>
            </div>
            <p className="mt-4 text-sm text-sea/80">{service.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {service.tags.map((tag) => (
                <span key={tag} className="pill">{tag}</span>
              ))}
            </div>
          </div>

          <div className="card p-6 grid gap-3">
            <h2 className="text-lg font-semibold text-sea">購入にあたってのお願い</h2>
            <div className="grid gap-2 text-sm text-sea/70">
              <p>納期目安: {service.delivery}</p>
              <p>制作の流れ: {service.flow.join(" → ")}</p>
              <p>提出前に必ず原稿を共有してください。</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-sea">評価・感想</h2>
            <div className="mt-4 grid gap-4">
              {service.reviewsList.map((review) => (
                <div key={review.id} className="border-b border-sand pb-4">
                  <div className="flex items-center gap-2 text-sm text-sea/70">
                    <span className="h-8 w-8 rounded-full bg-sand/70" />
                    <span>{review.name}</span>
                    <span>★ {review.rating}</span>
                  </div>
                  <p className="mt-2 text-sm text-sea/80">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="card p-6">
            <p className="text-sm text-sea/60">料金</p>
            <p className="mt-2 text-2xl font-semibold text-ink">¥{service.price.toLocaleString()}</p>
            <button className="btn btn-primary w-full mt-4">無料で見積り相談</button>
            <p className="mt-2 text-xs text-sea/60">見積り相談後に購入できます</p>
          </div>
          <div className="card p-6 grid gap-3">
            <div className="flex items-center gap-3">
              <img className="h-12 w-12 rounded-2xl" src={service.avatar} alt={service.tutor} />
              <div>
                <p className="text-sm font-semibold text-sea">{service.tutor}</p>
                <p className="text-xs text-sea/60">{service.university}</p>
              </div>
            </div>
            <button className="btn border border-sea text-sea">出品者に質問</button>
            <button className="btn border border-sea text-sea">フォロー 312</button>
            <Link className="text-xs text-accent" href={`/demo/tutor/${service.id}`}>
              プロフィール詳細を見る
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
