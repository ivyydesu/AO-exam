"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClient } from "../../../lib/demoClient";

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

type Tutor = {
  id: string;
  name: string;
  university: string;
  department: string;
  year: string;
  acceptedUniversities: string[];
  cramSchool: string;
  theme: string;
  experience: string;
  rating: number;
  reviews: number;
  avatar: string;
};

const fallbackTutors: Record<string, Tutor> = {
  "tutor-1": {
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
  "tutor-2": {
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
  "tutor-3": {
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
  "tutor-4": {
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
  "tutor-5": {
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
  "tutor-6": {
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
  "tutor-7": {
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
};

export default function ServicePage({ params }: { params: { id: string } }) {
  const [tutor, setTutor] = useState<Tutor>(fallbackTutors[params.id] ?? fallbackTutors["tutor-1"]);

  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase.from("demo_tutors").select("*").eq("id", params.id).maybeSingle();
      if (!data) return;
      setTutor({
        id: data.id,
        name: data.name,
        university: data.university,
        department: data.department,
        year: data.year ?? "2年",
        acceptedUniversities: data.accepted_universities ?? [],
        cramSchool: data.cram_school ?? "なし",
        theme: data.theme ?? "",
        experience: data.experience ?? "",
        rating: Number(data.rating ?? 0),
        reviews: Number(data.reviews ?? 0),
        avatar: data.avatar_url || fallbackTutors["tutor-1"].avatar
      });
    };
    load();
  }, [params.id]);

  return (
    <div className="grid gap-6">
      <header className="rounded-3xl bg-white border border-sand p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#FF6B00] via-[#F43787] to-[#6C5CE7]" />
            <p className="text-xl font-semibold text-ink">AO Match</p>
          </div>
          <div className="text-sm text-sea/70 flex gap-3">
            <Link href="/demo">一覧へ戻る</Link>
            <Link href="/favorites">お気に入り</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="card p-5 grid gap-3">
          <img className="w-full rounded-2xl object-cover" src={tutor.avatar} alt={tutor.name} />
          <p className="text-sm text-sea/60">評価 ★ {tutor.rating}（{tutor.reviews}）</p>
          <button className="btn btn-primary w-full">この先輩に依頼</button>
        </div>
        <div className="card p-6 grid gap-3">
          <h1 className="text-2xl font-semibold text-ink">{tutor.name}</h1>
          <p className="text-sm text-sea/70">{tutor.university} {tutor.department} {tutor.year}</p>
          <div className="grid gap-1 text-sm text-sea/70">
            <p>現役時にAOで合格した学校: {tutor.acceptedUniversities.join(" / ")}</p>
            <p>入っていた塾: {tutor.cramSchool}</p>
            <p>探究テーマ: {tutor.theme}</p>
            <p>指導経験: {tutor.experience}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
