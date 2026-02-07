import Link from "next/link";

const tutors = [
  {
    id: "tutor-1",
    name: "佐藤 亮太",
    university: "早稲田大学 政治経済学部",
    rating: 4.8,
    reviews: 42,
    specialties: ["志望理由書", "面接", "活動実績の言語化"],
    bio: "AO合格率95%。元学生会。書類→面接まで一気通貫で伴走。",
    experience: [
      "AO入試指導 120名以上",
      "学生会副代表（面接経験多数）",
      "高校向けワークショップ講師"
    ],
    achievements: [
      "合格実績: 早稲田/慶應/上智",
      "添削満足度 4.9/5.0",
      "平均返信速度 2時間以内"
    ]
  },
  {
    id: "tutor-2",
    name: "山本 なお",
    university: "慶應義塾大学 環境情報学部",
    rating: 4.6,
    reviews: 30,
    specialties: ["探究テーマ設計", "ポートフォリオ", "自己PR"],
    bio: "SFC対策専門。独自の質問集で準備しやすいと評判。",
    experience: [
      "SFC合格者メンター 80名",
      "探究テーマ伴走 50件",
      "プレゼン指導経験あり"
    ],
    achievements: [
      "合格実績: 慶應SFC/ICU",
      "ポートフォリオ制作支援",
      "面接対策テンプレ提供"
    ]
  },
  {
    id: "tutor-3",
    name: "高橋 遼",
    university: "上智大学 総合グローバル学部",
    rating: 4.9,
    reviews: 55,
    specialties: ["英語面接", "留学経験", "国際系志望"],
    bio: "英語面接に強い。海外経験を活かしたストーリー構築が得意。",
    experience: [
      "海外インターン2回",
      "英語面接対策 70名",
      "国際系学部の合格サポート"
    ],
    achievements: [
      "合格実績: 上智/ICU/国際系",
      "英語面接合格率 93%",
      "自己PR構築ワーク実施"
    ]
  }
];

export default function TutorDetailPage({ params }: { params: { id: string } }) {
  const tutor = tutors.find((item) => item.id === params.id);

  if (!tutor) {
    return (
      <div className="card p-6">
        <p className="text-sea">先輩が見つかりません。</p>
        <Link className="btn btn-secondary mt-4" href="/demo">戻る</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">Tutor Profile</p>
          <h1 className="text-3xl font-display font-semibold text-ink">{tutor.name}</h1>
          <p className="text-sm text-sea/70 mt-1">{tutor.university}</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary" href="/demo">高校生画面</Link>
          <Link className="btn btn-secondary" href="/demo/request">大学生画面</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-sea/60">評価</p>
          <p className="text-2xl font-semibold text-accent">★ {tutor.rating}</p>
          <p className="text-sm text-sea/60">レビュー {tutor.reviews}件</p>
        </div>
        <div className="card p-5 md:col-span-2">
          <h2 className="text-lg font-semibold text-sea">プロフィール</h2>
          <p className="mt-2 text-sm text-sea/80">{tutor.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tutor.specialties.map((tag) => (
              <span key={tag} className="text-xs rounded-full border border-sand px-3 py-1 text-sea/70">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-sea">経歴・実績</h3>
          <ul className="mt-3 grid gap-2 text-sm text-sea/80">
            {tutor.experience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-sea">合格実績・成果</h3>
          <ul className="mt-3 grid gap-2 text-sm text-sea/80">
            {tutor.achievements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-sea/70">この先輩に依頼したい場合</p>
          <p className="text-xs text-sea/60">デモ画面に戻って依頼フォームを開いてください。</p>
        </div>
        <Link className="btn btn-primary" href="/demo">デモへ戻る</Link>
      </div>
    </div>
  );
}
