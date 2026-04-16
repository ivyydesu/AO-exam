"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type FeaturedTutorApiItem = {
  id: string;
  name?: string;
  nickname?: string | null;
  full_name?: string | null;
  school?: string;
  avatar?: string;
  university?: string;
  department?: string;
  seminar?: string;
  grade?: string;
  researchTheme?: string;
  coachingExperience?: string;
  bio?: string;
  tutor_profiles?: {
    avatar_url?: string | null;
    university?: string | null;
    department?: string | null;
    seminar?: string | null;
    grade?: string | null;
    research_theme?: string | null;
    coaching_experience?: string | null;
    bio?: string | null;
  } | Array<{
    avatar_url?: string | null;
    university?: string | null;
    department?: string | null;
    seminar?: string | null;
    grade?: string | null;
    research_theme?: string | null;
    coaching_experience?: string | null;
    bio?: string | null;
  }> | null;
  verified?: boolean;
  rating?: number;
  reviews?: number;
};

const fallbackAvatar = "/avatars/mentor.png";

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

const beginnerSteps = [
  {
    title: "1. 先輩を絞り込む",
    description: "探究テーマ・ゼミ・大学学部で条件を絞ると、自分に近い先輩だけに絞れます。"
  },
  {
    title: "2. 詳細を比較する",
    description: "プロフィールを見ると、研究テーマ・指導経験・レビューから相性を判断できます。"
  },
  {
    title: "3. 相談申請する",
    description: "気になる先輩が見つかったら、まずメッセージか相談申請から始められます。"
  }
];

function toTags(department: string, seminar: string, researchTheme: string) {
  const parts = [department, seminar, ...researchTheme.split(/[、,。\n]/)].map((v) => v.trim()).filter(Boolean);
  const unique = Array.from(new Set(parts)).slice(0, 4);
  return unique.map((v) => (v.startsWith("#") ? v : `#${v}`));
}

function pickTutorProfile(value: FeaturedTutorApiItem["tutor_profiles"]) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [seminar, setSeminar] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("指定なし");
  const [sort, setSort] = useState("おすすめ順");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(4);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [mentorError, setMentorError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingMentors(true);
      setMentorError(null);
      try {
        const res = await fetch("/api/tutors/featured", { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error ?? "先輩一覧の取得に失敗しました");
        }
        const items = ((payload?.items ?? []) as FeaturedTutorApiItem[]).map((item) => {
          const tutorProfile = pickTutorProfile(item.tutor_profiles);
          const nickname = (item.nickname ?? "").trim();
          const fullName = (item.full_name ?? "").trim();
          const fallbackName = (item.name ?? "").trim();
          const universityRaw = (tutorProfile?.university || item.university || item.school || "").trim();
          const departmentRaw = (tutorProfile?.department || item.department || "").trim();
          const gradeRaw = (tutorProfile?.grade || item.grade || "").trim();
          const seminarRaw = (tutorProfile?.seminar || item.seminar || "").trim();
          const researchThemeRaw = (tutorProfile?.research_theme || item.researchTheme || "").trim();
          const coachingExperienceRaw = (tutorProfile?.coaching_experience || item.coachingExperience || "").trim();
          const avatarRaw = (item.avatar || tutorProfile?.avatar_url || "").trim();
          return {
            id: item.id,
            name: nickname || fullName || fallbackName || "先輩メンター",
            university: universityRaw || "未設定",
            department: departmentRaw || "未設定",
            grade: gradeRaw || "未設定",
            seminar: seminarRaw || "未設定",
            theme: researchThemeRaw || "未設定",
            tags: toTags(departmentRaw, seminarRaw, researchThemeRaw),
            rating: Number(item.rating ?? 5),
            verified: Boolean(item.verified),
            experience: coachingExperienceRaw || "未設定",
            avatar: avatarRaw || fallbackAvatar
          };
        });
        setMentors(items);
      } catch (error) {
        setMentorError(error instanceof Error ? error.message : "先輩一覧の取得に失敗しました");
      } finally {
        setLoadingMentors(false);
      }
    };
    void load();
  }, []);

  const activeFilters = useMemo(() => {
    return [
      keyword ? `キーワード: ${keyword}` : "",
      seminar ? `ゼミ: ${seminar}` : "",
      school ? `大学/学部: ${school}` : "",
      grade !== "指定なし" ? `学年: ${grade}` : "",
      selectedTag ? `タグ: ${selectedTag}` : ""
    ].filter(Boolean);
  }, [keyword, seminar, school, grade, selectedTag]);
  const hasFilterCondition = activeFilters.length > 0;

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
  }, [keyword, seminar, school, grade, sort, selectedTag, mentors]);
  const visibleMentors = filtered.slice(0, visibleCount);

  return (
    <div className="relative left-1/2 w-dvw max-w-[100dvw] -translate-x-1/2 overflow-x-hidden">
      <div className="min-h-screen bg-[#f8fafc] font-body text-[#334155]">
        <div className="relative overflow-hidden border-b border-gray-100 bg-white">
          <div className="hero-background-wrapper pointer-events-none absolute inset-0 z-0">
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
              <h1 className="hero-headline mb-4 text-4xl font-bold leading-tight text-white md:text-6xl">大学生に聞こう。</h1>
              <p className="hero-subcopy text-lg text-white/95">志望校の大学生があなたの受験をマンツーマンでサポートします</p>
            </div>

            <div id="welcome-card" className="relative mx-auto max-w-4xl">
              <div className="hero-sticker">一歩先ゆく先輩に気軽に相談</div>
              <div className="hero-search-shell p-6 md:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-[#10b981]">✨</span>
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-800">AI Recommendation</span>
                </div>
                <div className="flex flex-col gap-4 md:flex-row">
                  <input
                    id="home-ai-search-input"
                    className="flex-1 rounded-xl border-gray-200 bg-white/90 px-5 py-4 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-[#10b981] focus:ring-[#10b981]"
                    placeholder="探究テーマを入力（例：教育行政 いじめ問題、地域の活性化など）"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    type="text"
                  />
                  <button
                    id="signup-button"
                    className="group flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#10b981] px-8 py-4 font-bold text-white shadow-lg shadow-[#10b981]/30 transition-all hover:bg-[#059669]"
                  >
                    AIでおすすめを検索
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <section className="mb-10 rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold tracking-[0.18em] text-[#10b981]">FIRST STEP</p>
                <h2 className="text-2xl font-bold text-gray-900">最初にやることを、3ステップで整理しました</h2>
              </div>
              {hasFilterCondition ? (
                <div className="rounded-2xl bg-[#F0FDF4] px-4 py-3 text-sm text-[#047857]">
                  現在 <span className="font-bold">{filtered.length}人</span> の先輩が条件に一致しています。
                </div>
              ) : null}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {beginnerSteps.map((step) => (
                <div key={step.title} className="rounded-2xl border border-[#E5E7EB] bg-[#FCFEFD] p-5">
                  <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

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
                <div className="relative z-10 flex flex-wrap gap-2">
                  <button
                    type="button"
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
                      type="button"
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

              <div className="mb-6 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">おすすめの先輩</h2>
                    <p className="mt-1 text-sm text-gray-500">公開プロフィールの先輩のみを表示しています。</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">並び替え:</span>
                    <select className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-[#10b981] focus:ring-[#10b981]" value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option>おすすめ順</option>
                      <option>新着順</option>
                      <option>評価が高い順</option>
                    </select>
                  </div>
                </div>
                {activeFilters.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <span key={filter} className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-medium text-gray-600">{filter}</span>
                    ))}
                  </div>
                ) : null}
              </div>

              {loadingMentors ? <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600">先輩一覧を読み込み中です...</div> : null}
              {mentorError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{mentorError}</div> : null}

              {!loadingMentors && !mentorError ? (
                <>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-900">{mentor.name}</h3>
                              {mentor.verified ? <span className="rounded-full bg-[#10b981]/10 px-2 py-0.5 text-xs font-normal text-[#10b981]">学生証認証済み</span> : null}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{mentor.university} / {mentor.department} {mentor.grade}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium text-gray-700">ゼミ:</span> {mentor.seminar || "未設定"}
                            </div>
                          </div>
                        </div>

                        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                            <span>探究テーマ</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[#10b981]">公開プロフィール</span>
                          </div>
                          <p className="text-sm font-medium leading-6 text-gray-800">{mentor.theme || "未設定"}</p>
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
                          <div>
                            <div className="text-xs font-medium text-gray-900">{mentor.experience || "未設定"}</div>
                            <div className="mt-1 text-[11px] text-gray-500">プロフィールを見ると、相談できる内容と流れを確認できます。</div>
                          </div>
                          <Link href={`/service/${mentor.id}`} className="flex items-center gap-1 rounded-full bg-[#10b981] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#059669]">
                            詳細を見る <span>→</span>
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>

                  {visibleMentors.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">一致する先輩が見つかりませんでした。</div>
                  ) : null}

                  <div className="mt-12 text-center">
                    <button
                      className="rounded-xl border border-gray-200 bg-white px-8 py-3 font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setVisibleCount((prev) => prev + 4)}
                      disabled={visibleCount >= filtered.length}
                    >
                      もっと見る
                    </button>
                  </div>
                </>
              ) : null}
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
            <div className="mt-8 border-t border-gray-100 pt-8 text-center text-xs text-gray-400">© 2024 ユニブリ. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
