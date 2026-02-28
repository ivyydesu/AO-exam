"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BrandLogo from "../../components/BrandLogo";

type Mentor = {
  id: string;
  name: string;
  university: string;
  department: string;
  grade: string;
  seminar: string;
  theme: string;
  tags: string[];
  rating: number;
  verified?: boolean;
  experience: string;
  avatar: string;
};

const mentors: Mentor[] = [
  {
    id: "t1",
    name: "木戸 洵成",
    university: "成蹊大学",
    department: "法学部政治学科",
    grade: "2年",
    seminar: "教育行政ゼミ",
    theme:
      "教育行政といじめ問題について。若者のボランティア参加の動機づけと継続性に関する研究。",
    tags: ["#法学", "#志望理由書", "#面接", "#教育行政"],
    rating: 4.9,
    verified: true,
    experience: "指導経験: 個人3名",
    avatar: "/avatars/mentor.png"
  },
  {
    id: "t2",
    name: "佐々木 颯太",
    university: "明治大学",
    department: "情報コミュニケーション学部",
    grade: "3年",
    seminar: "メディア社会ゼミ",
    theme: "地域コミュニティとSNSの関係性。地方創生におけるデジタルマーケティングの活用。",
    tags: ["#情報", "#SNS", "#活動実績"],
    rating: 4.7,
    experience: "指導経験: 個別相談2名",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCBE50PVQOkz4fFObFPkkPrvZngyK7YeTDq2WUHxlMbd3Gp4odjcxmRV-WQsbxy8-ukkxm2zpMJlm3o7mCD-HomvnUiF5vaaKhJpPNtYlP1E9Mv6_k0huKelsOpNKg3iv8f7FJOqiNnLZADQN-GXpXTzgaZwTC3SsC3dlHXrHCZHEDRyig-b6NX_rMOwfD9_-Jc6l2LoxwdaaefqNzOwDoFrVtSzb5ZMlEq3WVsS9UThuhMzooBrUokOndTqnrbZZEz57qf14GZDIo"
  },
  {
    id: "t3",
    name: "田中 みさき",
    university: "立教大学",
    department: "社会学部",
    grade: "2年",
    seminar: "地域社会研究ゼミ",
    theme: "若者のボランティア参加の動機。サードプレイスとしての子供食堂の役割。",
    tags: ["#社会学", "#ボランティア", "#志望理由書"],
    rating: 4.8,
    experience: "指導経験: 添削1名",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA4pJ18C66-FncNSlBMnspkB895TfqyJJuhVsd_7mJjC4NC6KgJXxUBsNxyo3RD4QKoPgQe4PJw-DMvT6Jeft0ZNAAyKLgA6bVcChiV-WL3O9ynDOtZ2_ShvwSoaWU2BQlTazcmmoFAcFY6B0CTz9Lg_V26IMqe1uMav7RbRwBffEsAaRtM39FYfMA9StqySxfmdW8GFrmwAylbnx4YFKrbTxqJ0zjPqwelgMXx76VDAXUgs4AOnPZboSWVCMBSLCh7je8V2yqfWe8"
  },
  {
    id: "t4",
    name: "小林 航",
    university: "中央大学",
    department: "法学部",
    grade: "4年",
    seminar: "政治過程ゼミ",
    theme: "若者の投票行動の変化とインターネット選挙運動の影響について。",
    tags: ["#法学", "#面接", "#政治"],
    rating: 4.6,
    experience: "指導経験: 面接対策2名",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBX1sHwJPQ7XU-lqXxy9Ygsgq_5F5y6_dlHQdunM3THXZ9c_GpINSIWi4ttshYbXvNISMDM47zS-_XMKmXmGck77tta24-z576BK0Kq2lTwNWCCGPz1wUN0ZucKMSF5Y8Y9l6f8CzC6LzanG83Eqo3e_DOpv2uDHkBW9U23qD8D5xOXI2FBUq8qN766tdg_5Bgg4jrg2JxZKrtm4fzsZQHsy_D0Yhr20BJyCPRiHTrnhZvHBMvKIua0XtaA6ykectSPvhwrNUsaOTA"
  },
  {
    id: "t5",
    name: "中村 美咲",
    university: "青山学院大学",
    department: "教育人間科学部",
    grade: "3年",
    seminar: "教育政策ゼミ",
    theme: "地方自治体の教育政策と不登校支援の実効性。",
    tags: ["#教育行政", "#志望理由書", "#面接"],
    rating: 4.8,
    verified: true,
    experience: "指導経験: 合格サポート2名",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80&auto=format&fit=crop"
  },
  {
    id: "t6",
    name: "山口 蓮",
    university: "慶應義塾大学",
    department: "総合政策学部",
    grade: "4年",
    seminar: "地域政策ゼミ",
    theme: "地域活性化と若者起業のエコシステム構築。",
    tags: ["#経営", "#リーダーシップ", "#活動実績"],
    rating: 4.9,
    verified: true,
    experience: "指導経験: 面談サポート5名",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80&auto=format&fit=crop"
  },
  {
    id: "t7",
    name: "松本 あかり",
    university: "上智大学",
    department: "総合人間科学部",
    grade: "2年",
    seminar: "国際教育ゼミ",
    theme: "多文化共生教育における学校現場の課題分析。",
    tags: ["#社会学", "#ボランティア", "#英語面接"],
    rating: 4.7,
    experience: "指導経験: 書類添削3名",
    avatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&q=80&auto=format&fit=crop"
  },
  {
    id: "t8",
    name: "石田 大輝",
    university: "法政大学",
    department: "経営学部",
    grade: "3年",
    seminar: "マーケティング戦略ゼミ",
    theme: "SNS発信が高校生の進路選択に与える影響。",
    tags: ["#SNSマーケティング", "#ICT", "#経営"],
    rating: 4.6,
    experience: "指導経験: 相談対応4名",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80&auto=format&fit=crop"
  }
];

const popularTags = [
  { label: "#ICT", cls: "bg-blue-50 text-blue-600" },
  { label: "#SNSマーケティング", cls: "bg-pink-50 text-pink-600" },
  { label: "#ボランティア", cls: "bg-green-50 text-green-600" },
  { label: "#リーダーシップ", cls: "bg-purple-50 text-purple-600" },
  { label: "#教育格差", cls: "bg-orange-50 text-orange-600" },
  { label: "#経営", cls: "bg-gray-100 text-gray-600" },
  { label: "#志望理由書", cls: "bg-gray-100 text-gray-600" },
  { label: "#社会学", cls: "bg-gray-100 text-gray-600" }
];

const heroImages = [
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&q=80&auto=format&fit=crop"
];

const heroDurations = [35, 45, 50, 40];

export default function DemoPage() {
  const [keyword, setKeyword] = useState("");
  const [seminar, setSeminar] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("指定なし");
  const [sort, setSort] = useState("おすすめ順");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(4);


  const filtered = useMemo(() => {
    const q = keyword.toLowerCase();
    const s = seminar.toLowerCase();
    const u = school.toLowerCase();

    const base = mentors.filter((m) => {
      const text = `${m.name} ${m.university} ${m.department} ${m.seminar} ${m.theme} ${m.tags.join(" ")}`.toLowerCase();
      const k = !q || text.includes(q);
      const se = !s || m.seminar.toLowerCase().includes(s);
      const sc = !u || `${m.university} ${m.department}`.toLowerCase().includes(u);
      const g = grade === "指定なし" || m.grade === grade;
      const t = !selectedTag || m.tags.includes(selectedTag);
      return k && se && sc && g && t;
    });

    if (sort === "評価が高い順" || sort === "おすすめ順") return [...base].sort((a, b) => b.rating - a.rating);
    return base;
  }, [keyword, seminar, school, grade, sort, selectedTag]);
  const visibleMentors = filtered.slice(0, visibleCount);

  return (
    <div className="relative left-1/2 w-dvw max-w-[100dvw] -translate-x-1/2 overflow-x-hidden">
    <div className="min-h-screen bg-[#f8fafc] font-body text-[#334155]">

      <div className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="hero-background-wrapper absolute inset-0 z-0">
          <div className="hero-image-columns">
            {heroDurations.map((duration, columnIndex) => (
              <div key={`hero-col-${duration}`} className="hero-image-column">
                <div className="hero-image-track" style={{ animationDuration: `${duration}s` }}>
                  {[...heroImages, ...heroImages].map((src, imageIndex) => (
                    <div key={`hero-img-${columnIndex}-${imageIndex}`} className="hero-image-card">
                      <img src={src} alt="university life" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hero-glass-overlay" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <h1 className="hero-headline mb-4 text-4xl font-bold leading-tight text-white md:text-6xl">
              大学生に聞こう。
            </h1>
            <p className="hero-subcopy text-lg text-white/95">志望校の現役生が、あなたのAO入試・探究活動をマンツーマンでサポートします。</p>
          </div>

          <div className="relative mx-auto max-w-4xl">
            <div className="hero-sticker">一歩先ゆく先輩に気軽に相談</div>
            <div className="hero-search-shell p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[#10b981]">✨</span>
                <span className="text-sm font-bold uppercase tracking-wider text-gray-800">AI Recommendation</span>
              </div>
              <div className="flex flex-col gap-4 md:flex-row">
                <input
                  className="flex-1 rounded-xl border-gray-200 bg-white/90 px-5 py-4 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-[#10b981] focus:ring-[#10b981]"
                  placeholder="探究テーマを入力（例：教育行政 いじめ問題、地域の活性化など）"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  type="text"
                />
                <button className="group flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#10b981] px-8 py-4 font-bold text-white shadow-lg shadow-[#10b981]/30 transition-all hover:bg-[#059669]">
                  AIでおすすめを検索
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="space-y-6 lg:w-1/4">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">絞り込み検索</h3>
                <button
                  className="text-xs text-gray-500 transition-colors hover:text-[#10b981]"
                  onClick={() => {
                    setKeyword("");
                    setSeminar("");
                    setSchool("");
                    setGrade("指定なし");
                    setSelectedTag("");
                    setVisibleCount(4);
                  }}
                >
                  クリア
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">キーワード</label>
                  <input className="w-full rounded-lg border-gray-200 bg-gray-50 text-sm" placeholder="先輩名・タグ・大学など" value={keyword} onChange={(e) => setKeyword(e.target.value)} type="text" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">ゼミ</label>
                  <input className="w-full rounded-lg border-gray-200 bg-gray-50 text-sm" placeholder="例: 教育行政ゼミ" value={seminar} onChange={(e) => setSeminar(e.target.value)} type="text" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">大学/学部</label>
                    <input className="w-full rounded-lg border-gray-200 bg-gray-50 text-sm" placeholder="大学名" value={school} onChange={(e) => setSchool(e.target.value)} type="text" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">学年</label>
                    <select className="w-full rounded-lg border-gray-200 bg-gray-50 text-sm" value={grade} onChange={(e) => setGrade(e.target.value)}>
                      <option>指定なし</option>
                      <option>1年</option>
                      <option>2年</option>
                      <option>3年</option>
                      <option>4年</option>
                    </select>
                  </div>
                </div>
                <a href="#mentors-section" className="mt-4 block w-full rounded-xl border-2 border-[#10b981] bg-white py-2.5 text-center font-bold text-[#10b981] transition-colors hover:bg-[#10b981] hover:text-white">
                  この条件で検索
                </a>
              </div>
            </div>
          </aside>

          <div id="mentors-section" className="lg:w-3/4 scroll-mt-28">
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
                <span className="text-pink-400">📈</span>
                人気タグで探す
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:opacity-85 ${selectedTag === "" ? "bg-[#10b981] text-white" : "bg-gray-100 text-gray-600"}`}
                  onClick={() => {
                    setSelectedTag("");
                    setVisibleCount(4);
                  }}
                >
                  すべて
                </button>
                {popularTags.map((tag) => (
                  <button
                    key={tag.label}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:opacity-85 ${selectedTag === tag.label ? "bg-[#10b981] text-white" : tag.cls}`}
                    onClick={() => {
                      setSelectedTag(tag.label);
                      setVisibleCount(4);
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">おすすめの先輩</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">並び替え:</span>
                <select className="cursor-pointer border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option>おすすめ順</option>
                  <option>新着順</option>
                  <option>評価が高い順</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {visibleMentors.map((mentor) => (
                <article key={mentor.id} className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.025)] transition-all duration-300 hover:shadow-xl">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img alt="Mentor Profile" className="h-20 w-20 rounded-2xl object-cover shadow-md transition-transform duration-300 group-hover:scale-105" src={mentor.avatar} />
                      <div className="absolute -bottom-2 -right-2 flex items-center gap-0.5 rounded-lg border border-gray-100 bg-white px-1.5 py-0.5 shadow-sm">
                        <span className="text-xs text-yellow-400">★</span>
                        <span className="text-xs font-bold text-gray-800">{mentor.rating}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        {mentor.name}
                        {mentor.verified ? <span className="rounded-full bg-[#10b981]/10 px-2 py-0.5 text-xs font-normal text-[#10b981]">本人確認済</span> : null}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{mentor.university} / {mentor.department} {mentor.grade}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">ゼミ:</span> {mentor.seminar}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-1 text-xs text-gray-500">探究テーマ</div>
                    <p className="text-sm font-medium text-gray-800">{mentor.theme}</p>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {mentor.tags.map((tag) => (
                      <button
                        key={`${mentor.id}-${tag}`}
                        className={`rounded-md border px-2.5 py-1 text-xs ${selectedTag === tag ? "border-[#10b981] bg-[#10b981]/10 text-[#10b981]" : "border-gray-200 bg-gray-100 text-gray-600"}`}
                        onClick={() => {
                          setSelectedTag(tag);
                          setVisibleCount(4);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="text-xs text-gray-500">{mentor.experience}</div>
                    <Link href={`/service/${mentor.id}`} className="flex items-center gap-1 text-sm font-bold text-[#10b981] transition-colors hover:text-[#059669] hover:underline">
                      詳細を見る <span>→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 text-center">
              <button
                className="rounded-xl border border-gray-200 bg-white px-8 py-3 font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setVisibleCount((prev) => prev + 4)}
                disabled={visibleCount >= filtered.length}
              >
                もっと見る
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer id="about-section" className="mt-12 border-t border-gray-100 bg-white py-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4">
                <BrandLogo size="sm" textClassName="text-lg font-bold text-gray-900" />
              </div>
              <p className="text-sm text-gray-500">
                先輩とつながる、未来が広がる。<br />
                高校生のためのメンターマッチングサービス。
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-gray-900">サービス</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a className="hover:text-[#10b981]" href="/search">先輩を探す</a></li>
                <li><a className="hover:text-[#10b981]" href="/guide">ご利用ガイド</a></li>
                <li><a className="hover:text-[#10b981]" href="/pricing">料金プラン</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-gray-900">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a className="hover:text-[#10b981]" href="/faq">よくある質問</a></li>
                <li><a className="hover:text-[#10b981]" href="/contact">お問い合わせ</a></li>
                <li><a className="hover:text-[#10b981]" href="/terms">利用規約</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-gray-900">運営</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a className="hover:text-[#10b981]" href="/guide">会社概要</a></li>
                <li><a className="hover:text-[#10b981]" href="/privacy">プライバシーポリシー</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-8 text-center text-xs text-gray-400">© 2024 AO Match. All rights reserved.</div>
        </div>
      </footer>
    </div>
    </div>
  );
}
