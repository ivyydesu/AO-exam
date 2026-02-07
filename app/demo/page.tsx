"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// 型定義
type RequestData = {
  id: string;
  title: string;
  description: string;
  budget: number;
  tutorId: string;
  status: string;
  paymentIntentId: string;
  chatId: string;
};

// デモデータ
const demoTutors = [
  {
    id: "tutor-1",
    name: "佐藤 亮太",
    university: "早稲田大学 政治経済学部",
    rating: 4.8,
    reviews: 42,
    specialties: ["志望理由書", "面接", "活動実績の言語化"],
    bio: "AO合格率95%。元学生会。書類→面接まで一気通貫で伴走。"
  },
  {
    id: "tutor-2",
    name: "山本 なお",
    university: "慶應義塾大学 環境情報学部",
    rating: 4.6,
    reviews: 30,
    specialties: ["探究テーマ設計", "ポートフォリオ", "自己PR"],
    bio: "SFC対策専門。独自の質問集で準備しやすいと評判。"
  },
  {
    id: "tutor-3",
    name: "高橋 遼",
    university: "上智大学 総合グローバル学部",
    rating: 4.9,
    reviews: 55,
    specialties: ["英語面接", "留学経験", "国際系志望"],
    bio: "英語面接に強い。海外経験を活かしたストーリー構築が得意。"
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
  
  // 【修正】ここで <RequestData> を指定することで、idに文字列が入ってもエラーになりません
  const [request, setRequest] = useState<RequestData>(emptyRequest);
  
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

  const updateField = (key: keyof typeof emptyRequest, value: string | number) => {
    setRequest((prev) => ({ ...prev, [key]: value }));
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
    <div className="grid gap-8">
      <header className="grid gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">Demo Flow</p>
        <h1 className="text-4xl font-display font-semibold text-ink">プレゼン用MVP（ログインなし）</h1>
        <p className="text-sea/80 max-w-2xl">
          高校生が先輩に依頼 → 受注 → Stripeエスクロー支払い → 対応完了で確定、までを一画面で再現。
        </p>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "student", label: "高校生" },
            { key: "tutor", label: "大学生" },
            { key: "admin", label: "運営" }
          ] as const).map((role) => (
            <button
              key={role.key}
              className={`btn ${activeRole === role.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveRole(role.key)}
            >
              {role.label}
            </button>
          ))}
          <button className="btn border border-sea text-sea" onClick={resetDemo}>リセット</button>
        </div>
      </header>

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
            <p className="mt-3 text-sm text-sea/80">{tutor.bio}</p>
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
        </div>

        <div className="card p-6 grid gap-4">
          <h2 className="text-xl font-semibold text-sea">応募状況</h2>
          <p className="text-sm text-sea/70">依頼の進行状況を確認できます。</p>
          <div className="grid gap-3">
            {([
              { key: "draft", label: "依頼作成" },
              { key: "accepted", label: "受注承諾" },
              { key: "escrowed", label: "支払い完了" },
              { key: "completed", label: "完了" }
            ] as const).map((step) => {
              const isActive = request.status === step.key;
              const isDone =
                ["draft", "accepted", "escrowed", "completed"].indexOf(request.status) >=
                ["draft", "accepted", "escrowed", "completed"].indexOf(step.key);
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${isDone ? "bg-accent" : "bg-sand"} ${isActive ? "ring-2 ring-accent/60" : ""}`}
                  />
                  <p className={`text-sm ${isDone ? "text-sea" : "text-sea/50"}`}>{step.label}</p>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-sand p-4 text-sm text-sea/70">
            <p>現在: {request.status}</p>
            <p>担当予定: {selectedTutor.name}</p>
            <p>予算: ¥{request.budget.toLocaleString()}</p>
          </div>
          <p className="text-xs text-sea/60">受注は大学生画面で行われます。</p>
        </div>
      </section>

      <section className="text-sm text-sea/60">
        <p>
          Stripe決済はテストモードで動作します。成功後、
          <Link className="text-accent" href="/demo">この画面に戻って完了ボタンを押してください。</Link>
        </p>
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
