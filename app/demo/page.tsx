"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getClient, getVisitorId } from "../../lib/demoClient";
import DemoTopNav from "../../components/DemoTopNav";

const makeAvatar = (skin: string, hair: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="24" fill="${skin}"/>
      <circle cx="80" cy="70" r="36" fill="#F7D7C4"/>
      <path d="M44 70c8-22 64-22 72 0v12H44z" fill="${hair}"/>
      <circle cx="68" cy="72" r="4" fill="#333"/>
      <circle cx="92" cy="72" r="4" fill="#333"/>
      <path d="M68 92c8 8 16 8 24 0" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`
  )}`;

const demoTutors = [
  {
    id: "tutor-1",
    name: "木戸洵成",
    university: "成蹊大学",
    department: "法学部政治学科",
    seminar: "教育行政ゼミ",
    year: "2年",
    acceptedUniversities: ["成蹊大学 法学部政治学科"],
    cramSchool: "早稲田塾",
    theme: "教育行政といじめ問題について",
    experience: "個人的なサポートで成蹊大学法学部に3名合格",
    tags: ["法学", "志望理由書", "面接", "教育行政"],
    rating: 4.9,
    reviews: 12,
    avatar: "/avatars/mentor.png"
  },
  {
    id: "tutor-2",
    name: "佐々木 颯太",
    university: "明治大学",
    department: "情報コミュニケーション学部",
    seminar: "メディア社会ゼミ",
    year: "3年",
    acceptedUniversities: ["明治大学 情報コミュニケーション学部", "東洋大学 社会学部"],
    cramSchool: "河合塾",
    theme: "地域コミュニティとSNSの関係",
    experience: "個別相談で明治大・東洋大に2名合格",
    tags: ["情報", "SNS", "活動実績", "面接"],
    rating: 4.7,
    reviews: 9,
    avatar: makeAvatar("#F9F1FF", "#2F2D3A")
  },
  {
    id: "tutor-3",
    name: "田中 みさき",
    university: "立教大学",
    department: "社会学部",
    seminar: "地域社会研究ゼミ",
    year: "2年",
    acceptedUniversities: ["立教大学 社会学部"],
    cramSchool: "栄光ゼミナール",
    theme: "若者のボランティア参加の動機",
    experience: "志望理由書の添削で立教に1名合格",
    tags: ["社会学", "志望理由書", "ボランティア"],
    rating: 4.8,
    reviews: 6,
    avatar: makeAvatar("#FFF5E8", "#5B3A29")
  },
  {
    id: "tutor-4",
    name: "小林 航",
    university: "中央大学",
    department: "法学部",
    seminar: "政治過程ゼミ",
    year: "4年",
    acceptedUniversities: ["中央大学 法学部", "日本大学 法学部"],
    cramSchool: "早稲田塾",
    theme: "若者の投票行動の変化",
    experience: "面接対策で中央大に2名合格",
    tags: ["法学", "面接", "政治"],
    rating: 4.6,
    reviews: 5,
    avatar: makeAvatar("#E8FFF4", "#1F3A2B")
  },
  {
    id: "tutor-5",
    name: "山本 葵",
    university: "青山学院大学",
    department: "教育人間科学部",
    seminar: "教育工学ゼミ",
    year: "1年",
    acceptedUniversities: ["青山学院大学 教育人間科学部"],
    cramSchool: "SAPIX",
    theme: "教育現場のICT活用",
    experience: "活動実績整理で青学に1名合格",
    tags: ["教育", "ICT", "活動実績"],
    rating: 4.5,
    reviews: 4,
    avatar: makeAvatar("#EAF4FF", "#2A3E6B")
  },
  {
    id: "tutor-6",
    name: "鈴木 海斗",
    university: "法政大学",
    department: "経営学部",
    seminar: "組織マネジメントゼミ",
    year: "3年",
    acceptedUniversities: ["法政大学 経営学部", "専修大学 経営学部"],
    cramSchool: "東進ハイスクール",
    theme: "部活動とリーダーシップ形成",
    experience: "志望理由書の改善で法政に1名合格",
    tags: ["経営", "リーダーシップ", "志望理由書"],
    rating: 4.4,
    reviews: 3,
    avatar: makeAvatar("#FFF0F1", "#3A2A2A")
  },
  {
    id: "tutor-7",
    name: "石井 玲奈",
    university: "日本大学",
    department: "文理学部",
    seminar: "探究学習設計ゼミ",
    year: "2年",
    acceptedUniversities: ["日本大学 文理学部"],
    cramSchool: "個別教室のトライ",
    theme: "探究学習における問いの立て方",
    experience: "面接練習で日大に1名合格",
    tags: ["文理", "探究", "面接"],
    rating: 4.3,
    reviews: 2,
    avatar: makeAvatar("#F3FFF0", "#2C3A23")
  }
];

type TutorRecord = typeof demoTutors[number];

type BoardPost = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  tags: string[];
};

export default function DemoPage() {
  const [tutors, setTutors] = useState<TutorRecord[]>(demoTutors);
  const [visitorId, setVisitorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeminar, setFilterSeminar] = useState("");
  const [filterUniversityDept, setFilterUniversityDept] = useState("");
  const [searchGrade, setSearchGrade] = useState("");
  const [selectedTutorTags, setSelectedTutorTags] = useState<string[]>([]);
  const [aiThemeQuery, setAiThemeQuery] = useState("");
  const [aiPickedIds, setAiPickedIds] = useState<string[]>([]);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  const [boardText, setBoardText] = useState("");
  const [boardTagsInput, setBoardTagsInput] = useState("");
  const [selectedBoardTags, setSelectedBoardTags] = useState<string[]>([]);

  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;
    const id = getVisitorId();
    setVisitorId(id);
    const load = async () => {
      const { data: tutorData } = await supabase.from("demo_tutors").select("*");
      if (tutorData && tutorData.length > 0) {
        const avatarMap = Object.fromEntries(demoTutors.map((t) => [t.id, t.avatar]));
        setTutors(
          tutorData.map((t) => ({
            ...t,
            year: t.year ?? "2年",
            seminar: "未設定",
            acceptedUniversities: t.accepted_universities ?? [],
            cramSchool: t.cram_school ?? "なし",
            theme: t.theme ?? "",
            experience: t.experience ?? "",
            tags: Array.isArray(t.specialties) ? t.specialties : [],
            avatar: t.avatar_url || avatarMap[t.id] || avatarMap["tutor-1"]
          }))
        );
      }

      try {
        const res = await fetch("/api/tutors/search");
        const payload = await res.json();
        if (res.ok && Array.isArray(payload.items) && payload.items.length > 0) {
          const publishedTutors = payload.items.map(
            (item: {
              id: string;
              name: string;
              university: string;
              department: string;
              seminar: string;
              grade: string;
              school: string;
              avatar: string;
              researchTheme: string;
              coachingExperience: string;
            }) => ({
              id: item.id,
              name: item.name,
              university: item.university || "",
              department: item.department || "",
              seminar: item.seminar || "",
              year: item.grade || "",
              acceptedUniversities: item.school ? [item.school] : [],
              cramSchool: "未設定",
              theme: item.researchTheme || "",
              experience: item.coachingExperience || "",
              tags: [],
              rating: 5,
              reviews: 0,
              avatar: item.avatar || makeAvatar("#E6F0FF", "#2B3A67")
            })
          );
          setTutors((prev) => {
            const merged = [...prev];
            for (const t of publishedTutors) {
              const index = merged.findIndex((p) => p.id === t.id);
              if (index >= 0) merged[index] = { ...merged[index], ...t };
              else merged.push(t);
            }
            return merged;
          });
        }
      } catch {
        // ignore
      }
    };
    load();

    const stored = window.localStorage.getItem("demo-board");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as BoardPost[];
        setBoardPosts(
          parsed.map((post) => ({
            ...post,
            tags: Array.isArray(post.tags) ? post.tags : []
          }))
        );
      } catch {
        setBoardPosts([]);
      }
    }
  }, []);

  const allTutorTags = useMemo(
    () => Array.from(new Set(tutors.flatMap((tutor) => tutor.tags ?? []))).sort((a, b) => a.localeCompare(b, "ja")),
    [tutors]
  );

  const toggleTutorTag = (tag: string) => {
    setSelectedTutorTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const filteredTutors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const seminar = filterSeminar.trim().toLowerCase();
    const uniDept = filterUniversityDept.trim().toLowerCase();
    const grade = searchGrade.trim().toLowerCase();
    return tutors.filter((tutor) => {
      const baseText = [
        tutor.name,
        tutor.university,
        tutor.department,
        tutor.seminar ?? "",
        tutor.theme ?? "",
        ...(tutor.tags ?? [])
      ]
        .join(" ")
        .toLowerCase();
      const matchQuery = !query || baseText.includes(query);
      const matchSeminar = !seminar || (tutor.seminar ?? "").toLowerCase().includes(seminar);
      const matchUniDept =
        !uniDept || `${tutor.university} ${tutor.department}`.toLowerCase().includes(uniDept);
      const matchGrade = !grade || (tutor.year ?? "").toLowerCase() === grade;
      const matchTags =
        selectedTutorTags.length === 0 ||
        selectedTutorTags.every((tag) => (tutor.tags ?? []).includes(tag));
      return matchQuery && matchSeminar && matchUniDept && matchGrade && matchTags;
    });
  }, [tutors, searchQuery, filterSeminar, filterUniversityDept, searchGrade, selectedTutorTags]);

  const recommended = useMemo(() => {
    if (aiPickedIds.length > 0) {
      return filteredTutors
        .filter((t) => aiPickedIds.includes(t.id))
        .sort((a, b) => aiPickedIds.indexOf(a.id) - aiPickedIds.indexOf(b.id))
        .slice(0, 3);
    }
    return [...filteredTutors].sort((a, b) => b.rating - a.rating).slice(0, 3);
  }, [filteredTutors, aiPickedIds]);

  const normalizeTags = (input: string) => {
    const values = input
      .split(/[,、\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
    return Array.from(new Set(values));
  };

  const addPost = () => {
    if (!boardText.trim()) return;
    const tags = normalizeTags(boardTagsInput);
    const next: BoardPost = {
      id: crypto.randomUUID(),
      author: "高校生",
      body: boardText.trim(),
      createdAt: new Date().toISOString(),
      tags
    };
    const updated = [next, ...boardPosts].slice(0, 20);
    setBoardPosts(updated);
    window.localStorage.setItem("demo-board", JSON.stringify(updated));
    setBoardText("");
    setBoardTagsInput("");
  };

  const allBoardTags = useMemo(
    () => Array.from(new Set(boardPosts.flatMap((post) => post.tags))).sort((a, b) => a.localeCompare(b, "ja")),
    [boardPosts]
  );

  const visibleBoardPosts = useMemo(() => {
    if (selectedBoardTags.length === 0) return boardPosts;
    return boardPosts.filter((post) =>
      selectedBoardTags.every((tag) => post.tags.includes(tag))
    );
  }, [boardPosts, selectedBoardTags]);

  const toggleBoardTag = (tag: string) => {
    setSelectedBoardTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const searchTutorsByApi = async () => {
    const params = new URLSearchParams();
    if (filterUniversityDept.trim()) params.set("university", filterUniversityDept.trim());
    if (filterSeminar.trim()) params.set("seminar", filterSeminar.trim());
    if (searchGrade.trim()) params.set("grade", searchGrade.trim());

    try {
      const res = await fetch(`/api/tutors/search?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) return;
      const items = (payload.items ?? []).map((item: {
        id: string;
        name: string;
        university: string;
        department: string;
        grade: string;
        seminar: string;
        school: string;
        avatar: string;
        researchTheme: string;
        coachingExperience: string;
      }) => ({
        id: item.id,
        name: item.name,
        university: item.university,
        department: item.department,
        seminar: item.seminar || "",
        year: item.grade || "",
        acceptedUniversities: item.school ? [item.school] : [],
        cramSchool: "未設定",
        theme: item.researchTheme || "",
        experience: item.coachingExperience || "",
        tags: [],
        rating: 5,
        reviews: 0,
        avatar: item.avatar || makeAvatar("#E6F0FF", "#2B3A67")
      }));
      if (items.length > 0) setTutors(items);
    } catch {
      // Ignore API error and keep current list
    }
  };

  const runAiRecommendation = () => {
    const prompt = aiThemeQuery.trim().toLowerCase();
    if (!prompt) {
      setAiPickedIds([]);
      return;
    }
    const keywords = prompt.split(/[\s、,]+/).filter(Boolean);
    const scored = tutors
      .map((tutor) => {
        const text = [
          tutor.theme ?? "",
          tutor.experience ?? "",
          tutor.seminar ?? "",
          ...(tutor.tags ?? [])
        ]
          .join(" ")
          .toLowerCase();
        const matchCount = keywords.reduce((acc, kw) => (text.includes(kw) ? acc + 1 : acc), 0);
        const score = matchCount * 10 + tutor.rating;
        return { id: tutor.id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setAiPickedIds(scored.map((s) => s.id));
  };

  return (
    <div className="grid gap-8">
      <DemoTopNav />

      <section className="card p-5 grid gap-3">
        <p className="text-sm text-sea/60">絞り込み検索（1行）</p>
        <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_180px_120px]">
          <input
            className="input"
            placeholder="キーワード（先輩名・タグ・大学など）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <input
            className="input"
            placeholder="ゼミ（例: 教育行政ゼミ）"
            value={filterSeminar}
            onChange={(e) => setFilterSeminar(e.target.value)}
          />
          <input
            className="input"
            placeholder="大学/学部"
            value={filterUniversityDept}
            onChange={(e) => setFilterUniversityDept(e.target.value)}
          />
          <select className="input" value={searchGrade} onChange={(e) => setSearchGrade(e.target.value)}>
            <option value="">学年</option>
            <option value="1年">1年</option>
            <option value="2年">2年</option>
            <option value="3年">3年</option>
            <option value="4年">4年</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" type="button" onClick={searchTutorsByApi}>
            検索APIで絞り込み
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterSeminar("");
              setFilterUniversityDept("");
              setSearchGrade("");
              setSelectedTutorTags([]);
              setAiPickedIds([]);
            }}
          >
            条件クリア
          </button>
        </div>
      </section>

      <section className="card p-5 grid gap-3">
        <p className="text-sm text-sea/60">探究テーマAIおすすめ</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[240px]"
            placeholder="探究テーマを入力（例: 教育行政 いじめ問題）"
            value={aiThemeQuery}
            onChange={(e) => setAiThemeQuery(e.target.value)}
          />
          <button className="btn btn-primary" type="button" onClick={runAiRecommendation}>
            AIおすすめをピックアップ
          </button>
          {aiPickedIds.length > 0 && (
            <button className="btn btn-secondary" type="button" onClick={() => setAiPickedIds([])}>
              AIおすすめ解除
            </button>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-sea/60">先輩タグで一括検索</span>
          {allTutorTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTutorTag(tag)}
              className={`rounded-full px-3 py-1 text-xs border ${
                selectedTutorTags.includes(tag)
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-sea/70 border-sand"
              }`}
            >
              #{tag}
            </button>
          ))}
          {selectedTutorTags.length > 0 && (
            <button
              type="button"
              className="rounded-full px-3 py-1 text-xs border border-sand text-sea/70"
              onClick={() => setSelectedTutorTags([])}
            >
              クリア
            </button>
          )}
        </div>
      </section>

      <section className="card p-6 grid gap-4">
        <h2 className="text-lg font-semibold text-sea">
          {aiPickedIds.length > 0 ? "AIおすすめの先輩" : "おすすめの先輩"}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {recommended.map((tutor) => (
            <div key={tutor.id} className="rounded-2xl border border-sand bg-white p-4 shadow-sm card-hover">
              <div className="flex items-center gap-3">
                <img className="h-14 w-14 rounded-2xl object-cover" src={tutor.avatar} alt={tutor.name} />
                <div>
                  <p className="text-sm font-semibold text-sea">{tutor.name}</p>
                  <p className="text-xs text-sea/60">{tutor.university} / {tutor.department} {tutor.year}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-sea/60">合格校: {tutor.acceptedUniversities.join(" / ")}</p>
              <p className="text-xs text-sea/60">ゼミ: {tutor.seminar || "未設定"}</p>
              <p className="text-xs text-sea/60">探究テーマ: {tutor.theme}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-sea/70">
                <span>★ {tutor.rating}（{tutor.reviews}）</span>
                <Link className="text-accent" href={`/service/${tutor.id}`}>詳細</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 grid gap-4">
        <h2 className="text-lg font-semibold text-sea">先輩プロフィール一覧</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTutors.map((tutor) => (
            <div key={tutor.id} className="rounded-2xl border border-sand bg-white p-4 shadow-sm card-hover">
              <div className="flex items-center gap-3">
                <img className="h-16 w-16 rounded-2xl object-cover" src={tutor.avatar} alt={tutor.name} />
                <div>
                  <p className="text-base font-semibold text-ink">{tutor.name}</p>
                  <p className="text-xs text-sea/60">{tutor.university} / {tutor.department} {tutor.year}</p>
                  <p className="text-xs text-sea/60">ゼミ: {tutor.seminar || "未設定"}</p>
                  <p className="text-xs text-sea/60">合格校: {tutor.acceptedUniversities.join(" / ")}</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-sea/60">
                <p>探究テーマ: {tutor.theme}</p>
                <p>指導経験: {tutor.experience}</p>
              </div>
              {(tutor.tags ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tutor.tags.map((tag) => (
                    <button
                      key={`${tutor.id}-${tag}`}
                      type="button"
                      onClick={() => toggleTutorTag(tag)}
                      className="rounded-full border border-sand px-2 py-0.5 text-[11px] text-sea/70"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-sea/70">
                <span>★ {tutor.rating}（{tutor.reviews}）</span>
                <Link className="text-accent" href={`/service/${tutor.id}`}>詳細</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 grid gap-4">
        <h2 className="text-lg font-semibold text-sea">先輩の掲示板</h2>
        <p className="text-sm text-sea/60">応援メッセージや、どんな対策をしたかを自由に投稿できます。</p>
        <div className="grid gap-2">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="応援メッセージや体験談を投稿..."
              value={boardText}
              onChange={(e) => setBoardText(e.target.value)}
            />
            <button className="btn btn-primary" onClick={addPost}>投稿</button>
          </div>
          <input
            className="input"
            placeholder="タグを入力（例: 志望理由書, 面接, 成蹊）"
            value={boardTagsInput}
            onChange={(e) => setBoardTagsInput(e.target.value)}
          />
        </div>
        <div className="rounded-xl border border-sand p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-sea/60">タグで一括検索</span>
            {allBoardTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleBoardTag(tag)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  selectedBoardTags.includes(tag)
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-sea/70 border-sand"
                }`}
              >
                #{tag}
              </button>
            ))}
            {selectedBoardTags.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBoardTags([])}
                className="rounded-full px-3 py-1 text-xs border border-sand text-sea/70"
              >
                クリア
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3">
          {visibleBoardPosts.map((post) => (
            <div key={post.id} className="rounded-xl border border-sand bg-white p-3">
              <div className="flex items-center justify-between text-xs text-sea/60">
                <span>{post.author}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              {post.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <button
                      key={`${post.id}-${tag}`}
                      type="button"
                      className="rounded-full border border-sand px-2 py-0.5 text-[11px] text-sea/70"
                      onClick={() => toggleBoardTag(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-sm text-sea/80">{post.body}</p>
            </div>
          ))}
          {visibleBoardPosts.length === 0 && <p className="text-sm text-sea/60">該当する投稿はありません。</p>}
        </div>
      </section>

      <section className="text-xs text-sea/50">Visitor: {visitorId}</section>
    </div>
  );
}
