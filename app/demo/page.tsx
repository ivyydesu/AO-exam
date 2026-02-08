"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

export default function DemoPage() {
  const [activeRole, setActiveRole] = useState<"student" | "tutor" | "admin">("student");

  const [request, setRequest] = useState<RequestState>(emptyRequest);

  const [hydrated, setHydrated] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviews, setReviews] = useState<Record<string, { id: string; name: string; rating: number; text: string }[]>>(
    demoReviews as unknown as Record<string, { id: string; name: string; rating: number; text: string }[]>
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
    const storedReviews = window.localStorage.getItem("demo-reviews");
    if (storedReviews) {
      try {
        setReviews(JSON.parse(storedReviews));
      } catch (e) {
        console.error("Failed to parse demo-reviews", e);
      }
    }
    setHydrated(true);
  }, []);

  // requestが更新されたらローカルストレージに保存
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("demo-request", JSON.stringify(request));
  }, [request, hydrated]);

  // 他のタブとの同期など
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "demo-request" && event.newValue) {
        setRequest(JSON.parse(event.newValue));
      }
    };
    const onFocus = () => {
      const saved = window.localStorage.getItem("demo-request");
      if (saved) {
        setRequest(JSON.parse(saved));
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const selectedTutor = useMemo(
    () => demoTutors.find((tutor) => tutor.id === request.tutorId) ?? demoTutors[0],
    [request.tutorId]
  );

  const updateField = (key: keyof RequestState, value: string | number) => {
    setRequest((prev) => ({ ...prev, [key]: value as RequestState[keyof RequestState] }));
  };

  const createRequest = () => {
    const id = request.id || crypto.randomUUID();
    setRequest((prev) => ({
      ...prev,
      id,
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

  const submitReview = () => {
    const stored = window.localStorage.getItem("demo-reviews");
    const currentReviews = stored ? JSON.parse(stored) : {};
    const tutorReviews = currentReviews[request.tutorId] ?? [];
    
    tutorReviews.unshift({
      id: crypto.randomUUID(),
      name: "高校生",
      rating: reviewRating,
      text: reviewText
    });
    
    currentReviews[request.tutorId] = tutorReviews;
    window.localStorage.setItem("demo-reviews", JSON.stringify(currentReviews));
    setReviews(currentReviews);
    setReviewText("");
    setReviewRating(5);
    setShowReviewModal(false);
  };

  return (
    <div className="grid gap-10">
      <div className="rounded-3xl bg-white/90 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-6 py-4">
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
            <button className="btn btn-secondary">出品する</button>
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
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 text-sm text-sea/70">
          <span>サービスを探す</span>
          <span>プロ人材を探す</span>
          <span>ノウハウ・素材を探す</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">NEW</span>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="card p-5 text-sm text-sea/70">
          <p className="text-sm font-semibold text-sea mb-3">カテゴリから探す</p>
          <div className="grid gap-2">
            {[
              "志望理由書・自己PR",
              "面接練習",
              "探究テーマ設計",
              "ポートフォリオ制作",
              "英語面接対策",
              "推薦入試対策",
              "学部別対策"
            ].map((cat) => (
              <div key={cat} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-cloud">
                <span>{cat}</span>
                <span>›</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "新着Pick Up!", desc: "注目の先輩を毎日更新", color: "from-blue-500/80 to-blue-200/60" },
              { title: "合格者インタビュー", desc: "実績から選ぶAO対策", color: "from-emerald-500/70 to-emerald-200/60" },
              { title: "面接強化ウィーク", desc: "直前対策もOK", color: "from-orange-500/70 to-orange-200/60" }
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl bg-gradient-to-br ${item.color} p-5 text-white`}>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-xs text-white/90">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="card p-6 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-sea">人気の先輩</h2>
              <div className="flex gap-2 text-xs text-sea/60">
                <span>おすすめ</span>
                <span>評価順</span>
                <span>新着</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {demoTutors.map((tutor) => (
                <div key={tutor.id} className={`rounded-2xl border border-sand bg-white p-4 shadow-sm ${tutor.id === request.tutorId ? "ring-2 ring-accent/50" : ""}`}>
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
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {demoTutors.map((tutor) => (
          <div key={tutor.id} className={`card p-5 ${tutor.id === request.tutorId ? "border-accent" : ""}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-sea">{tutor.name}</h3>
              <span className="text-sm text-accent">★ {tutor.rating}</span>
            </div>
            <p className="text-sm text-sea/70 mt-1">{tutor.university}</p>
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
            <Link className="btn mt-2 w-fit border border-sea text-sea" href={`/demo/tutor/${tutor.id}`}>
              詳細を見る
            </Link>
          </div>
        ))}
      </section>

      <section className="card p-6 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-sea">レビュー履歴一覧</h2>
          <p className="text-sm text-sea/70">対象: {selectedTutor.name}</p>
        </div>
        <div className="grid gap-3">
          {(reviews[selectedTutor.id] ?? []).map((review) => (
            <div key={review.id} className="rounded-xl border border-sand bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-sea">{review.name}</p>
                <span className="text-sm text-accent">★ {review.rating}</span>
              </div>
              <p className="mt-2 text-sm text-sea/80">{review.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 grid gap-4">
          <h2 className="text-xl font-semibold text-sea">高校生画面</h2>
          <label className="grid gap-2">
            <span className="label">依頼タイトル</span>
            <input
              className="input"
              value={request.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="例: 志望理由書の添削"
              disabled={activeRole !== "student"}
            />
          </label>
          <label className="grid gap-2">
            <span className="label">依頼内容</span>
            <textarea
              className="input h-24"
              value={request.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="AO対策の相談内容を書いてください"
              disabled={activeRole !== "student"}
            />
          </label>
          <label className="grid gap-2">
            <span className="label">予算</span>
            <input
              className="input"
              type="number"
              value={request.budget}
              onChange={(e) => updateField("budget", Number(e.target.value))}
              disabled={activeRole !== "student"}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {request.status === "draft" && (
              <button className="btn btn-primary" onClick={createRequest} disabled={activeRole !== "student"}>
                依頼を送る
              </button>
            )}
            {request.status === "accepted" && (
              <button className="btn btn-secondary" onClick={startCheckout}>
                Stripeで支払い（エスクロー）
              </button>
            )}
            {request.status === "escrowed" && (
              <button className="btn btn-secondary" onClick={capturePayment}>
                対応完了 → 決済確定
              </button>
            )}
            {request.chatId && (
              <button className="btn border border-sea text-sea" onClick={openChat}>
                チャットを開く
              </button>
            )}
            {["completed", "escrowed"].includes(request.status) && (
              <button className="btn btn-primary" onClick={() => setShowReviewModal(true)}>
                大学生を評価する
              </button>
            )}
          </div>
          <p className="text-sm text-sea/70">ステータス: {request.status}</p>
          {request.paymentIntentId && (
            <p className="text-xs text-sea/60">PaymentIntent: {request.paymentIntentId}</p>
          )}
          <Link className="btn w-fit border border-sea text-sea" href="/status">
            応募状況を確認
          </Link>
        </div>
      </section>

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
