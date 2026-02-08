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

const tutors = [
  {
    id: "tutor-1",
    name: "佐藤 亮太",
    university: "早稲田大学",
    department: "政治経済学部",
    acceptedUniversities: ["慶應義塾大学 経済学部", "上智大学 総合グローバル学部"],
    taughtCount: 128,
    rating: 4.8,
    reviews: 42,
    specialties: ["志望理由書", "面接", "活動実績の言語化"],
    avatar: makeAvatar("#E6F0FF", "#2B3A67")
  },
  {
    id: "tutor-2",
    name: "山本 なお",
    university: "慶應義塾大学",
    department: "環境情報学部",
    acceptedUniversities: ["慶應義塾大学 SFC", "ICU 教養学部"],
    taughtCount: 86,
    rating: 4.6,
    reviews: 30,
    specialties: ["探究テーマ設計", "ポートフォリオ", "自己PR"],
    avatar: makeAvatar("#FFF1E6", "#5C3A2E")
  },
  {
    id: "tutor-3",
    name: "高橋 遼",
    university: "上智大学",
    department: "総合グローバル学部",
    acceptedUniversities: ["ICU 教養学部", "明治大学 国際日本学部"],
    taughtCount: 102,
    rating: 4.9,
    reviews: 55,
    specialties: ["英語面接", "留学経験", "国際系志望"],
    avatar: makeAvatar("#E9F7F1", "#1F3B2C")
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
          <p className="text-sm text-sea/70 mt-1">{tutor.university} / {tutor.department}</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary" href="/demo">高校生画面</Link>
          <Link className="btn btn-secondary" href="/demo/request">大学生画面</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="card p-5 grid gap-4">
          <img className="w-full rounded-2xl object-cover" src={tutor.avatar} alt={`${tutor.name}の写真`} />
          <div className="grid gap-1 text-sm text-sea/70">
            <p>評価 ★ {tutor.rating}</p>
            <p>レビュー {tutor.reviews}件</p>
            <p>指導人数 {tutor.taughtCount}名</p>
          </div>
        </div>
        <div className="card p-5 grid gap-4">
          <h2 className="text-lg font-semibold text-sea">プロフィール</h2>
          <div className="grid gap-2 text-sm text-sea/80">
            <p>現在の大学・学科: {tutor.university} / {tutor.department}</p>
            <p>合格大学: {tutor.acceptedUniversities.join(" / ")}</p>
            <p>これまで教えてきた人数: {tutor.taughtCount}名</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tutor.specialties.map((tag) => (
              <span key={tag} className="text-xs rounded-full border border-sand px-3 py-1 text-sea/70">
                {tag}
              </span>
            ))}
          </div>
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
