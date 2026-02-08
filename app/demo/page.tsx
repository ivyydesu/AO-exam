"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getClient, getVisitorId } from "../../lib/demoClient";

const makeAvatar = (skin: string, hair: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="24" fill="${skin}"/>
      <circle cx="80" cy="70" r="36" fill="#F7D7C4"/>
      <path d="M44 70c8-22 64-22 72 0v12H44z" fill="${hair}"/>
      <circle cx="68" cy="72" r="4" fill="#333"/>
      <circle cx="92" cy="72" r="4" fill="#333"/>
      <path d="M68 92c8 8 16 8 24 0" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`
  )}`;

// デモデータ
const demoTutors = [
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
    price: 15000,
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
    price: 18000,
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
    price: 20000,
    avatar: makeAvatar("#E9F7F1", "#1F3B2C")
  }
];

const demoReviews = {
  "tutor-1": [
    { id: "r1", name: "高3・文系", rating: 5, text: "志望理由書が一気に読みやすくなった。面接も自信がついた。" },
    { id: "r2", name: "高2・理系", rating: 4, text: "活動実績の整理が的確。締切までの進め方が具体的だった。" }
  ],
  "tutor-2": [
    { id: "r3", name: "高3・探究型", rating: 5, text: "テーマ設計が本当に助かった。面談で聞かれる質問も予想的中。" },
    { id: "r4", name: "高3・SFC志望", rating: 4, text: "ポートフォリオの構成がクリアになった。" }
  ],
  "tutor-3": [
    { id: "r5", name: "高3・国際系", rating: 5, text: "英語面接の練習が実戦的で安心できた。" },
    { id: "r6", name: "高2・留学予定", rating: 5, text: "ストーリー作りがうまい。自分の強みが言語化できた。" }
  ]
} as const;

type RequestState = {
  id: string;
  title: string;
  description: string;
  budget: number;
  tutorId: string;
  status: "draft" | "accepted" | "escrow_pending" | "escrowed" | "completed";
  paymentIntentId: string;
  chatId: string;
};

const emptyRequest: RequestState = {
  id: "",
  title: "",
  description: "",
  budget: 15000,
  tutorId: demoTutors[0].id,
  status: "draft",
  paymentIntentId: "",
  chatId: ""
};

type TutorRecord = typeof demoTutors[number];
type CategoryRecord = { id: string; name: string };
type TutorCategoryRecord = { tutor_id: string; category_id: string };

export default function DemoPage() {
  const [activeRole, setActiveRole] = useState<"student" | "tutor" | "admin">("student");

  const [request, setRequest] = useState<RequestState>(emptyRequest);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [tutorIndex, setTutorIndex] = useState(0);
  const [tutorAnimate, setTutorAnimate] = useState(true);
  const [tutorPaused, setTutorPaused] = useState(false);
  const [visitorId, setVisitorId] = useState<string>("");
  const [tutors, setTutors] = useState<TutorRecord[]>(demoTutors);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tutorCategories, setTutorCategories] = useState<TutorCategoryRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [hydrated, setHydrated] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [selectedReviews, setSelectedReviews] = useState<{ id: string; name: string; rating: number; text: string }[]>(
    [...demoReviews["tutor-1"]]
  );

  // ローカルストレージからの読み込み
  useEffect(() => {
    const saved = window.localStorage.getItem("demo-request");
    if (saved) {
      try {
        setRequest(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse demo-request", e);
      }
    }
    setHydrated(true);
  }, []);

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
            avatar: t.avatar_url || avatarMap[t.id] || avatarMap["tutor-1"]
          }))
        );
      }
      const { data: categoryData } = await supabase.from("demo_categories").select("*");
      setCategories(categoryData ?? []);
      const { data: tcData } = await supabase.from("demo_tutor_categories").select("tutor_id, category_id");
      setTutorCategories(tcData ?? []);
      const { data: favData } = await supabase.from("demo_favorites").select("service_id").eq("visitor_id", id);
      setFavoriteIds(new Set((favData ?? []).map((f) => f.service_id)));
      const { data: reqData } = await supabase
        .from("demo_requests")
        .select("*")
        .eq("visitor_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (reqData) {
        setRequest((prev) => ({
          ...prev,
          id: reqData.id,
          title: reqData.title,
          description: reqData.description,
          budget: reqData.budget,
          tutorId: reqData.tutor_id,
          status: reqData.status,
          paymentIntentId: reqData.payment_intent_id ?? "",
          chatId: reqData.chat_id ?? ""
        }));
      }
    };
    load();
  }, []);

  const selectedTutor = useMemo(
    () => tutors.find((tutor) => tutor.id === request.tutorId) ?? tutors[0] ?? demoTutors[0],
    [request.tutorId, tutors]
  );

  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !selectedTutor?.id) return;
    const loadReviews = async () => {
      const { data } = await supabase
        .from("demo_reviews")
        .select("id, reviewer_name, rating, review_text")
        .eq("service_id", selectedTutor.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setSelectedReviews(
          data.map((r) => ({
            id: r.id,
            name: r.reviewer_name,
            rating: r.rating,
            text: r.review_text
          }))
        );
      } else {
        const fallback = (demoReviews as unknown as Record<string, { id: string; name: string; rating: number; text: string }[]>)[selectedTutor.id] ?? [];
        setSelectedReviews([...fallback]);
      }
    };
    loadReviews();
  }, [selectedTutor?.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % 3);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  const fallbackTutorCategories: TutorCategoryRecord[] = [
    { tutor_id: "tutor-1", category_id: "c1" },
    { tutor_id: "tutor-1", category_id: "c2" },
    { tutor_id: "tutor-2", category_id: "c3" },
    { tutor_id: "tutor-3", category_id: "c4" }
  ];

  const displayedTutors = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const effectiveTutorCategories = tutorCategories.length ? tutorCategories : fallbackTutorCategories;
    return tutors.filter((tutor) => {
      const matchesQuery =
        !lower ||
        [tutor.name, tutor.university, tutor.department, ...(tutor.specialties ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(lower);
      const matchesCategory =
        !selectedCategory ||
        effectiveTutorCategories.some((tc) => tc.tutor_id === tutor.id && tc.category_id === selectedCategory);
      return matchesQuery && matchesCategory;
    });
  }, [tutors, query, selectedCategory, tutorCategories]);

  const slideTutors = useMemo(
    () => (displayedTutors.length ? displayedTutors : demoTutors),
    [displayedTutors]
  );

  useEffect(() => {
    if (tutorPaused) return;
    const id = window.setInterval(() => {
      setTutorIndex((prev) => prev + 1);
    }, 3000);
    return () => window.clearInterval(id);
  }, [tutorPaused, slideTutors.length]);

  // requestが更新されたらローカルストレージに保存
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("demo-request", JSON.stringify(request));
  }, [request, hydrated]);

  // 他のタブとの同期など
  useEffect(() => {
    const onFocus = () => {
      const supabase = getClient();
      if (!supabase || !visitorId) return;
      supabase
        .from("demo_requests")
        .select("*")
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setRequest((prev) => ({
              ...prev,
              id: data.id,
              title: data.title,
              description: data.description,
              budget: data.budget,
              tutorId: data.tutor_id,
              status: data.status,
              paymentIntentId: data.payment_intent_id ?? "",
              chatId: data.chat_id ?? ""
            }));
          }
        });
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [visitorId]);

  

  const updateField = (key: keyof RequestState, value: string | number) => {
    setRequest((prev) => ({ ...prev, [key]: value as RequestState[keyof RequestState] }));
  };

  const createRequest = async () => {
    const supabase = getClient();
    if (!supabase || !visitorId) return;
    const { data, error } = await supabase
      .from("demo_requests")
      .insert({
        visitor_id: visitorId,
        tutor_id: request.tutorId,
        title: request.title,
        description: request.description,
        budget: request.budget,
        status: "draft"
      })
      .select("*")
      .single();
    if (error || !data) return;
    setRequest((prev) => ({
      ...prev,
      id: data.id,
      status: "draft"
    }));
  };

  const startCheckout = async () => {
    try {
      const response = await fetch("/api/stripe/demo-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: request.title || "AO対策サポート",
          amount: request.budget,
          requestId: request.id
        })
      });
      if (!response.ok) {
        alert("決済セッション作成に失敗しました");
        return;
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("決済URLの取得に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  const capturePayment = async () => {
    if (!request.paymentIntentId) return;
    try {
      const response = await fetch("/api/stripe/demo-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: request.paymentIntentId })
      });
      if (!response.ok) {
        alert("決済確定に失敗しました");
        return;
      }
      setRequest((prev) => ({ ...prev, status: "completed" }));
      const supabase = getClient();
      if (supabase && request.id) {
        await supabase.from("demo_requests").update({ status: "completed" }).eq("id", request.id);
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  const resetDemo = () => {
    window.localStorage.removeItem("demo-request");
    setRequest(emptyRequest);
  };

  const openChat = () => {
    if (!request.chatId) return;
    window.location.href = `/demo/chat/${request.chatId}`;
  };

  const toggleFavorite = async (serviceId: string) => {
    const supabase = getClient();
    if (!supabase || !visitorId) return;
    if (favoriteIds.has(serviceId)) {
      await supabase.from("demo_favorites").delete().eq("visitor_id", visitorId).eq("service_id", serviceId);
      const next = new Set(favoriteIds);
      next.delete(serviceId);
      setFavoriteIds(next);
      return;
    }
    await supabase.from("demo_favorites").insert({ visitor_id: visitorId, service_id: serviceId });
    setFavoriteIds(new Set([...favoriteIds, serviceId]));
  };

  const submitReview = async () => {
    const supabase = getClient();
    if (!supabase) return;
    if (!reviewText.trim()) return;
    await supabase.from("demo_reviews").insert({
      service_id: request.tutorId,
      reviewer_name: "高校生",
      rating: reviewRating,
      review_text: reviewText
    });
    setReviewText("");
    setReviewRating(5);
    setShowReviewModal(false);
    const { data } = await supabase
      .from("demo_reviews")
      .select("id, reviewer_name, rating, review_text")
      .eq("service_id", request.tutorId)
      .order("created_at", { ascending: false });
    setSelectedReviews(
      (data ?? []).map((r) => ({ id: r.id, name: r.reviewer_name, rating: r.rating, text: r.review_text }))
    );
  };

  return (
    <div className="grid gap-10 fade-in">
      <div className="rounded-3xl bg-white border border-sand slide-up nav-shadow">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#FF6B00] via-[#F43787] to-[#6C5CE7]" />
            <p className="text-xl font-semibold text-ink">AO Match</p>
          </div>
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-[#B8C2CC] bg-white px-4 py-2 shadow-soft">
              <span className="text-xs text-sea/60">サービス</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="キーワードで検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="text-sm text-sea" aria-label="検索">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#5B6770" strokeWidth="1.5" />
                  <path d="M20 20L17 17" stroke="#5B6770" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-sea/70">
            <Link href="/status">取引管理</Link>
            <Link href="/cases">案件管理</Link>
            <Link href="/favorites">お気に入り</Link>
            <button className="text-accent">受注モードへ切替</button>
            <div className="h-8 w-8 rounded-full border border-sand grid place-items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C8.7 3 6 5.7 6 9v4l-2 2v1h16v-1l-2-2V9c0-3.3-2.7-6-6-6z" stroke="#5B6770" strokeWidth="1.5" />
                <path d="M9 19a3 3 0 0 0 6 0" stroke="#5B6770" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="h-8 w-8 rounded-full border border-sand grid place-items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16v12H4z" stroke="#5B6770" strokeWidth="1.5" />
                <path d="M4 7l8 6 8-6" stroke="#5B6770" strokeWidth="1.5" />
              </svg>
            </div>
            <details className="relative">
              <summary className="list-none cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-sand/70 grid place-items-center text-xs">👤</div>
              </summary>
              <div className="absolute right-0 mt-3 w-56 rounded-xl border border-sand bg-white p-3 shadow-lg">
                <p className="text-sm font-semibold text-sea">kota0507</p>
                <div className="mt-2 grid gap-2 text-sm text-sea/70">
                  <Link href="/status">注文履歴</Link>
                  <Link href="/favorites">お気に入り</Link>
                  <Link href="/settings">設定</Link>
                </div>
              </div>
            </details>
          </div>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2 text-sm text-sea/70">
          <div className="flex flex-wrap gap-6">
            <details className="relative">
              <summary className="list-none cursor-pointer">AO対策を探す ▾</summary>
              <div className="absolute z-10 mt-2 w-48 rounded-xl border border-sand bg-white p-2 shadow-soft">
                <button className="w-full text-left px-2 py-1 hover:bg-cloud" onClick={() => setSelectedCategory(null)}>すべて表示</button>
                {(categories.length ? categories : [
                  { id: "c1", name: "志望理由書・自己PR" },
                  { id: "c2", name: "面接練習" },
                  { id: "c3", name: "探究テーマ設計" },
                  { id: "c4", name: "英語面接対策" }
                ]).map((cat) => (
                  <button key={cat.id} className="w-full text-left px-2 py-1 hover:bg-cloud" onClick={() => setSelectedCategory(cat.id)}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </details>
            <button onClick={() => document.getElementById("popular-mentors")?.scrollIntoView({ behavior: "smooth" })}>
              先輩メンターを探す ▾
            </button>
            <button onClick={() => setQuery("面接")}>
              書類・面接ノウハウ <span className="ml-2 badge-new">NEW</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary">依頼を投稿して募集</button>
            <button className="text-sea/70">先輩を紹介してもらう ▾</button>
            <button className="text-sea/70">サポートを出品</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-citrus text-white px-6 py-2 text-sm flex items-center justify-center gap-4 slide-up">
        <span>今すぐ使えるクーポンを1枚お持ちです</span>
        <span className="rounded-full bg-white/20 px-3 py-1">10%OFF</span>
        <span className="rounded-full bg-white/20 px-3 py-1">あと5日</span>
        <button className="underline">詳細を見る</button>
      </div>

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="card p-5 text-sm text-sea/70">
          <p className="text-sm font-semibold text-sea mb-3">カテゴリから探す</p>
          <div className="grid gap-2">
            {(categories.length ? categories : [
              { id: "c1", name: "志望理由書・自己PR" },
              { id: "c2", name: "面接練習" },
              { id: "c3", name: "探究テーマ設計" },
              { id: "c4", name: "英語面接対策" }
            ]).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex items-center justify-between rounded-lg px-2 py-1 hover:bg-cloud ${
                  selectedCategory === cat.id ? "bg-cloud text-accent" : ""
                }`}
              >
                <span>{cat.name}</span>
                <span>›</span>
              </button>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold text-sea mb-3">閲覧履歴</p>
            <div className="grid gap-3">
              {(displayedTutors.length ? displayedTutors : demoTutors).slice(0, 2).map((tutor) => (
                <div key={tutor.id} className="rounded-xl border border-[#E5E7EB] bg-white p-2 card-hover">
                  <div className="aspect-[16/9] rounded-lg bg-sand/50 border border-[#E5E7EB]" />
                  <p className="mt-2 text-xs text-sea/70">{tutor.name}</p>
                  <p className="text-xs text-sea/60">★ {tutor.rating}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_0.8fr] stagger">
            <div className="rounded-2xl bg-[#FEEAB7] p-6 grid gap-2 shadow-soft card-hover">
              <p className="text-xl font-bold text-[#0E4A7B]">AO入試対策</p>
              <p className="text-sm text-[#0E4A7B]">書類も面接も丸ごとおまかせ！</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="h-10 rounded bg-white/70" />
                <div className="h-10 rounded bg-white/70" />
                <div className="h-10 rounded bg-white/70" />
              </div>
            </div>
            <div
              className={`rounded-2xl p-6 text-white grid gap-2 shadow-soft card-hover relative transition-colors duration-500 ${
                [
                  "bg-[#59D1C2]",
                  "bg-[#60A5FA]",
                  "bg-[#F59E0B]"
                ][bannerIndex]
              }`}
            >
              <p className="text-lg font-semibold">
                {["新着 Pick Up!", "人気カテゴリ特集", "直前対策ウィーク"][bannerIndex]}
              </p>
              <p className="text-sm">
                {["旬のサービスをチェック", "評価の高い先輩を紹介", "面接・書類を一気に対策"][bannerIndex]}
              </p>
              <div className="mt-2 h-20 rounded-xl bg-white/30" />
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white text-sea shadow-soft"
                onClick={() => setBannerIndex((bannerIndex + 2) % 3)}
                aria-label="前へ"
              >
                ‹
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white text-sea shadow-soft"
                onClick={() => setBannerIndex((bannerIndex + 1) % 3)}
                aria-label="次へ"
              >
                ›
              </button>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-2 w-2 rounded-full ${i === bannerIndex ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#FDE3C1] p-6 grid gap-2 shadow-soft card-hover">
              <p className="text-sm text-[#7C5D35]">AO Match コンテンツマーケット</p>
              <p className="text-lg font-semibold text-[#7C5D35]">すぐ買えてすぐ使える</p>
              <button className="mt-2 w-fit rounded-full bg-[#F59E0B] px-3 py-1 text-xs text-white">コンテンツを見る</button>
            </div>
          </div>

          <div id="popular-mentors" className="card p-6 grid gap-4 slide-up">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-sea">人気の先輩</h2>
              <div className="flex gap-2 text-xs text-sea/60">
                <span className="nav-pill">おすすめ</span>
                <span className="nav-pill">評価順</span>
                <span className="nav-pill">新着</span>
              </div>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setTutorPaused(true)}
              onMouseLeave={() => setTutorPaused(false)}
            >
              <button
                className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white text-sea shadow-soft border border-[#E5E7EB]"
                onClick={() => setTutorIndex((tutorIndex + slideTutors.length - 1) % slideTutors.length)}
                aria-label="前へ"
              >
                ‹
              </button>
              <button
                className="absolute -right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white text-sea shadow-soft border border-[#E5E7EB]"
                onClick={() => setTutorIndex((tutorIndex + 1) % slideTutors.length)}
                aria-label="次へ"
              >
                ›
              </button>
              <div className="overflow-hidden">
                <div
                  className={`flex gap-4 ${tutorAnimate ? "transition-transform duration-700 ease-in-out" : ""}`}
                  style={{ transform: `translateX(-${(tutorIndex % slideTutors.length) * (100 / 3)}%)` }}
                  onTransitionEnd={() => {
                    if (tutorIndex >= slideTutors.length) {
                      setTutorAnimate(false);
                      setTutorIndex(0);
                      requestAnimationFrame(() => setTutorAnimate(true));
                    }
                  }}
                >
                  {[...slideTutors, ...slideTutors].map((tutor, idx) => (
                    <div
                      key={`${tutor.id}-${idx}`}
                      className={`relative min-w-[calc(33.333%-10.666px)] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm card-hover ${tutor.id === request.tutorId ? "ring-2 ring-accent/50" : ""}`}
                    >
                      <button
                        className={`absolute right-3 top-3 h-7 w-7 rounded-full border border-sand bg-white text-xs ${
                          favoriteIds.has(tutor.id) ? "text-accent" : "text-sea/50"
                        }`}
                        onClick={() => toggleFavorite(tutor.id)}
                        aria-label="お気に入り"
                      >
                        ♥
                      </button>
                      <div className="flex items-center gap-3">
                        <img className="h-14 w-14 rounded-2xl object-cover" src={tutor.avatar} alt={`${tutor.name}の写真`} />
                        <div>
                          <p className="text-sm font-semibold text-sea">{tutor.name}</p>
                          <p className="text-xs text-sea/60">{tutor.university} / {tutor.department}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tutor.specialties.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[11px] rounded-full border border-sand px-2 py-0.5 text-sea/70">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-sea/60">指導人数 {tutor.taughtCount}名</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-sea/70">
                        <span>★ {tutor.rating}（{tutor.reviews}）</span>
                        <span className="text-sea font-semibold">¥{tutor.price.toLocaleString()}〜</span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {activeRole === "student" && (
                          <button
                            className="btn btn-primary w-full"
                            onClick={() => {
                              updateField("tutorId", tutor.id);
                              setShowRequestModal(true);
                            }}
                          >
                            この先輩に依頼
                          </button>
                        )}
                        <Link className="btn w-full border border-sea text-sea" href={`/service/${tutor.id}`}>
                          商品ページを見る
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                {slideTutors.map((_, i) => (
                  <button
                    key={i}
                    className={`h-2 w-2 rounded-full border ${i === (tutorIndex % slideTutors.length) ? "bg-accent border-accent" : "bg-white border-[#D1D5DB]"}`}
                    onClick={() => setTutorIndex(i)}
                    aria-label={`スライド${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {(displayedTutors.length ? displayedTutors : demoTutors).slice(0, 6).map((tutor) => (
          <div key={tutor.id} className={`card p-5 card-hover relative ${tutor.id === request.tutorId ? "border-accent" : ""}`}>
            <button
              className={`absolute right-3 top-3 h-7 w-7 rounded-full border border-sand bg-white text-xs ${
                favoriteIds.has(tutor.id) ? "text-accent" : "text-sea/50"
              }`}
              onClick={() => toggleFavorite(tutor.id)}
              aria-label="お気に入り"
            >
              ♥
            </button>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-sea">{tutor.name}</h3>
              <span className="text-sm text-accent">★ {tutor.rating}</span>
            </div>
            <p className="text-sm text-sea/70 mt-1">{tutor.university} / {tutor.department}</p>
            <p className="text-xs text-sea/60 mt-1">レビュー {tutor.reviews}件</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tutor.specialties.map((tag) => (
                <span key={tag} className="text-xs rounded-full border border-sand px-3 py-1 text-sea/70">
                  {tag}
                </span>
              ))}
            </div>
            {activeRole === "student" && (
              <button
                className={`btn mt-4 ${tutor.id === request.tutorId ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  updateField("tutorId", tutor.id);
                  setShowRequestModal(true);
                }}
              >
                この先輩に依頼
              </button>
            )}
            <Link className="btn mt-2 w-fit border border-sea text-sea" href={`/service/${tutor.id}`}>
              商品ページを見る
            </Link>
          </div>
        ))}
      </section>

      {/* ホームからレビュー履歴と高校生画面は削除 */}

      <section className="text-sm text-sea/60">
        <p>
          Stripe決済はテストモードで動作します。成功後、
          <Link className="text-accent" href="/demo">この画面に戻って完了ボタンを押してください。</Link>
        </p>
      </section>

      <section className="grid gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-sea">カテゴリ別人気ランキング</h2>
          <span className="text-sm text-sea/60">期間: 2/1〜2/7</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { rank: 1, title: "志望理由書の添削", tutor: "佐藤 亮太", price: "¥15,000" },
            { rank: 2, title: "面接練習（60分）", tutor: "山本 なお", price: "¥18,000" },
            { rank: 3, title: "探究テーマ設計", tutor: "高橋 遼", price: "¥20,000" }
          ].map((item) => (
            <div key={item.rank} className="card p-4">
              <div className="flex items-center gap-2 text-sm text-sea/70">
                <span className="h-6 w-6 rounded-full bg-accent text-white grid place-items-center text-xs">{item.rank}</span>
                <span>{item.title}</span>
              </div>
              <p className="mt-2 text-xs text-sea/60">講師: {item.tutor}</p>
              <p className="text-sm font-semibold text-sea">{item.price}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-sea">人気ユーザーランキング</h2>
          <span className="text-sm text-sea/60">今週</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {demoTutors.map((tutor, index) => (
            <div key={tutor.id} className="card p-4 flex items-center gap-3">
              <span className="h-7 w-7 rounded-full bg-sea text-white grid place-items-center text-xs">{index + 1}</span>
              <img className="h-12 w-12 rounded-2xl object-cover" src={tutor.avatar} alt={tutor.name} />
              <div>
                <p className="text-sm font-semibold text-sea">{tutor.name}</p>
                <p className="text-xs text-sea/60">評価 ★ {tutor.rating}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 依頼モーダル */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-sea">依頼フォーム</h3>
              <button className="text-sm text-sea/60" onClick={() => setShowRequestModal(false)}>
                閉じる
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-sea/70">選択中の先輩: {selectedTutor.name}</p>
              <label className="grid gap-2">
                <span className="label">依頼タイトル</span>
                <input
                  className="input"
                  value={request.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="例: 志望理由書の添削"
                />
              </label>
              <label className="grid gap-2">
                <span className="label">依頼内容</span>
                <textarea
                  className="input h-24"
                  value={request.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="AO対策の相談内容を書いてください"
                />
              </label>
              <label className="grid gap-2">
                <span className="label">予算</span>
                <input
                  className="input"
                  type="number"
                  value={request.budget}
                  onChange={(e) => updateField("budget", Number(e.target.value))}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    createRequest();
                    setShowRequestModal(false);
                  }}
                >
                  依頼を送る
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                  下書き保存
                </button>
              </div>
              <p className="text-xs text-sea/60">送信後、大学生側で受注 → 支払いへ進みます。</p>
            </div>
          </div>
        </div>
      )}

      {/* レビューモーダル */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-sea">評価を投稿</h3>
              <button className="text-sm text-sea/60" onClick={() => setShowReviewModal(false)}>
                閉じる
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="label">評価（5段階）</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`text-2xl ${value <= reviewRating ? "text-accent" : "text-sand"}`}
                      onClick={() => setReviewRating(value)}
                      aria-label={`評価 ${value}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-sea/70">{reviewRating}/5</span>
                </div>
              </label>
              <label className="grid gap-2">
                <span className="label">コメント</span>
                <textarea
                  className="input h-24"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="対応の感想を書いてください"
                  required
                />
              </label>
              <button className="btn btn-primary" onClick={submitReview} disabled={reviewText.trim().length === 0}>
                評価を送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
