"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getClient, getVisitorId } from "../../lib/demoClient";

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
    year: "2年",
    acceptedUniversities: ["成蹊大学 法学部政治学科"],
    cramSchool: "早稲田塾",
    theme: "教育行政といじめ問題について",
    experience: "個人的なサポートで成蹊大学法学部に3名合格",
    rating: 4.9,
    reviews: 12,
    avatar: "/avatars/mentor.png"
  },
  {
    id: "tutor-2",
    name: "佐々木 颯太",
    university: "明治大学",
    department: "情報コミュニケーション学部",
    year: "3年",
    acceptedUniversities: ["明治大学 情報コミュニケーション学部", "東洋大学 社会学部"],
    cramSchool: "河合塾",
    theme: "地域コミュニティとSNSの関係",
    experience: "個別相談で明治大・東洋大に2名合格",
    rating: 4.7,
    reviews: 9,
    avatar: makeAvatar("#F9F1FF", "#2F2D3A")
  },
  {
    id: "tutor-3",
    name: "田中 みさき",
    university: "立教大学",
    department: "社会学部",
    year: "2年",
    acceptedUniversities: ["立教大学 社会学部"],
    cramSchool: "栄光ゼミナール",
    theme: "若者のボランティア参加の動機",
    experience: "志望理由書の添削で立教に1名合格",
    rating: 4.8,
    reviews: 6,
    avatar: makeAvatar("#FFF5E8", "#5B3A29")
  },
  {
    id: "tutor-4",
    name: "小林 航",
    university: "中央大学",
    department: "法学部",
    year: "4年",
    acceptedUniversities: ["中央大学 法学部", "日本大学 法学部"],
    cramSchool: "早稲田塾",
    theme: "若者の投票行動の変化",
    experience: "面接対策で中央大に2名合格",
    rating: 4.6,
    reviews: 5,
    avatar: makeAvatar("#E8FFF4", "#1F3A2B")
  },
  {
    id: "tutor-5",
    name: "山本 葵",
    university: "青山学院大学",
    department: "教育人間科学部",
    year: "1年",
    acceptedUniversities: ["青山学院大学 教育人間科学部"],
    cramSchool: "SAPIX",
    theme: "教育現場のICT活用",
    experience: "活動実績整理で青学に1名合格",
    rating: 4.5,
    reviews: 4,
    avatar: makeAvatar("#EAF4FF", "#2A3E6B")
  },
  {
    id: "tutor-6",
    name: "鈴木 海斗",
    university: "法政大学",
    department: "経営学部",
    year: "3年",
    acceptedUniversities: ["法政大学 経営学部", "専修大学 経営学部"],
    cramSchool: "東進ハイスクール",
    theme: "部活動とリーダーシップ形成",
    experience: "志望理由書の改善で法政に1名合格",
    rating: 4.4,
    reviews: 3,
    avatar: makeAvatar("#FFF0F1", "#3A2A2A")
  },
  {
    id: "tutor-7",
    name: "石井 玲奈",
    university: "日本大学",
    department: "文理学部",
    year: "2年",
    acceptedUniversities: ["日本大学 文理学部"],
    cramSchool: "個別教室のトライ",
    theme: "探究学習における問いの立て方",
    experience: "面接練習で日大に1名合格",
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
};

export default function DemoPage() {
  const [tutors, setTutors] = useState<TutorRecord[]>(demoTutors);
  const [visitorId, setVisitorId] = useState("");
  const [searchUniversity, setSearchUniversity] = useState("");
  const [searchTheme, setSearchTheme] = useState("");
  const [desiredUniversity, setDesiredUniversity] = useState("");
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  const [boardText, setBoardText] = useState("");

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
            acceptedUniversities: t.accepted_universities ?? [],
            cramSchool: t.cram_school ?? "なし",
            theme: t.theme ?? "",
            experience: t.experience ?? "",
            avatar: t.avatar_url || avatarMap[t.id] || avatarMap["tutor-1"]
          }))
        );
      }
    };
    load();

    const stored = window.localStorage.getItem("demo-board");
    if (stored) {
      try {
        setBoardPosts(JSON.parse(stored));
      } catch {
        setBoardPosts([]);
      }
    }
  }, []);

  const filteredTutors = useMemo(() => {
    const uni = searchUniversity.trim().toLowerCase();
    const theme = searchTheme.trim().toLowerCase();
    return tutors.filter((tutor) => {
      const matchUni = !uni || `${tutor.university} ${tutor.department}`.toLowerCase().includes(uni);
      const matchTheme = !theme || (tutor.theme ?? "").toLowerCase().includes(theme);
      return matchUni && matchTheme;
    });
  }, [tutors, searchUniversity, searchTheme]);

  const recommended = useMemo(() => {
    if (!desiredUniversity.trim()) {
      return [...filteredTutors].sort((a, b) => b.rating - a.rating).slice(0, 3);
    }
    const target = desiredUniversity.trim().toLowerCase();
    return [...filteredTutors]
      .filter((t) => t.acceptedUniversities.join(" ").toLowerCase().includes(target))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [filteredTutors, desiredUniversity]);

  const addPost = () => {
    if (!boardText.trim()) return;
    const next: BoardPost = {
      id: crypto.randomUUID(),
      author: "高校生",
      body: boardText.trim(),
      createdAt: new Date().toISOString()
    };
    const updated = [next, ...boardPosts].slice(0, 20);
    setBoardPosts(updated);
    window.localStorage.setItem("demo-board", JSON.stringify(updated));
    setBoardText("");
  };

  return (
    <div className="grid gap-8">
      <header className="rounded-3xl bg-white border border-sand p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#FF6B00] via-[#F43787] to-[#6C5CE7]" />
            <div>
              <p className="text-xl font-semibold text-ink">AO Match</p>
              <p className="text-xs text-sea/60">高校生向け：先輩プロフィール一覧</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-sea/70">
            <Link href="/status">取引管理</Link>
            <Link href="/favorites">お気に入り</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-sea/60">大学・学部で検索</p>
          <input
            className="input mt-2"
            placeholder="例: 成蹊大学 法学部"
            value={searchUniversity}
            onChange={(e) => setSearchUniversity(e.target.value)}
          />
        </div>
        <div className="card p-5">
          <p className="text-sm text-sea/60">探究テーマで検索</p>
          <input
            className="input mt-2"
            placeholder="例: いじめ問題"
            value={searchTheme}
            onChange={(e) => setSearchTheme(e.target.value)}
          />
        </div>
        <div className="card p-5">
          <p className="text-sm text-sea/60">志望校からおすすめ</p>
          <input
            className="input mt-2"
            placeholder="例: 成蹊大学"
            value={desiredUniversity}
            onChange={(e) => setDesiredUniversity(e.target.value)}
          />
        </div>
      </section>

      <section className="card p-6 grid gap-4">
        <h2 className="text-lg font-semibold text-sea">おすすめの先輩</h2>
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
                  <p className="text-xs text-sea/60">合格校: {tutor.acceptedUniversities.join(" / ")}</p>
                  <p className="text-xs text-sea/60">塾: {tutor.cramSchool}</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-sea/60">
                <p>探究テーマ: {tutor.theme}</p>
                <p>指導経験: {tutor.experience}</p>
              </div>
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
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="応援メッセージや体験談を投稿..."
            value={boardText}
            onChange={(e) => setBoardText(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addPost}>投稿</button>
        </div>
        <div className="grid gap-3">
          {boardPosts.map((post) => (
            <div key={post.id} className="rounded-xl border border-sand bg-white p-3">
              <div className="flex items-center justify-between text-xs text-sea/60">
                <span>{post.author}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm text-sea/80">{post.body}</p>
            </div>
          ))}
          {boardPosts.length === 0 && <p className="text-sm text-sea/60">まだ投稿はありません。</p>}
        </div>
      </section>

      <section className="text-xs text-sea/50">Visitor: {visitorId}</section>
    </div>
  );
}
