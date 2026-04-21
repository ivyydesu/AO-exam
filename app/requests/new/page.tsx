"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";

type TutorInfo = {
  id: string;
  full_name: string;
  school: string | null;
};

const TOPICS = [
  { value: "university_talk", label: "大学のことをざっくばらんに教えてほしい" },
  { value: "theme_consult", label: "探究テーマの相談に乗ってほしい" },
  { value: "essay_review", label: "志望理由書を見て欲しい（アドバイスやブラッシュアップ）" },
  { value: "interview_prep", label: "2次対策を手伝って欲しい / 対策法を教えて欲しい" },
  { value: "other", label: "その他" }
] as const;

const METHODS = [
  { value: "text", label: "文章ベースのやり取り" },
  { value: "online_mtg", label: "オンラインMTG" }
] as const;

const DURATIONS = [
  { value: "15m", label: "15分" },
  { value: "30m", label: "30分" },
  { value: "60m", label: "1時間" },
  { value: "120m", label: "2時間" },
  { value: "180m", label: "3時間" }
] as const;

function calcSuggestedPrice(topic: string, method: string, duration: string) {
  void topic;
  void method;
  void duration;
  return 2200;
}

function RequestNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorId = searchParams.get("tutorId") ?? "";
  const [step, setStep] = useState(1);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<"student" | "tutor" | "admin" | null>(null);
  const [tutorInfo, setTutorInfo] = useState<TutorInfo | null>(null);

  const [supportTopic, setSupportTopic] = useState<string>(TOPICS[0].value);
  const [supportTopicOther, setSupportTopicOther] = useState("");
  const [supportMethod, setSupportMethod] = useState<string>(METHODS[0].value);
  const [duration, setDuration] = useState<string>(DURATIONS[2].value);
  const [deadline, setDeadline] = useState("");
  const [requestedPrice, setRequestedPrice] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestedPrice = useMemo(
    () => calcSuggestedPrice(supportTopic, supportMethod, duration),
    [supportTopic, supportMethod, duration]
  );

  const stepItems = [
    { no: 1, title: "相談内容", desc: "何を相談したいかを決める" },
    { no: 2, title: "相談方法", desc: "文章かオンラインかを選ぶ" },
    { no: 3, title: "想定時間", desc: "必要時間の目安を決める" },
    { no: 4, title: "希望期限", desc: "いつまでに必要かを入力" },
    { no: 5, title: "金額確認", desc: "相場を見ながら希望額を調整" }
  ] as const;

  const selectedTopicLabel =
    supportTopic === "other"
      ? supportTopicOther.trim() || "その他"
      : TOPICS.find((item) => item.value === supportTopic)?.label ?? "未選択";
  const selectedMethodLabel = METHODS.find((item) => item.value === supportMethod)?.label ?? "未選択";
  const selectedDurationLabel = DURATIONS.find((item) => item.value === duration)?.label ?? "未選択";

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      setSessionUserId(uid);
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        setSessionRole((profile?.role as "student" | "tutor" | "admin" | null) ?? null);
      }

      if (!tutorId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, school")
        .eq("id", tutorId)
        .maybeSingle();
      if (profile) setTutorInfo(profile as TutorInfo);
    };
    load();
  }, [tutorId]);

  useEffect(() => {
    if (!requestedPrice || requestedPrice <= 0) {
      setRequestedPrice(suggestedPrice);
    }
  }, [suggestedPrice, requestedPrice]);

  const onSubmit = async () => {
    setError(null);
    if (!sessionUserId) {
      setError("ログインが必要です");
      return;
    }
    if (sessionRole !== "student") {
      setError("依頼申請は高校生アカウントのみ利用できます");
      return;
    }
    if (!tutorId) {
      setError("先輩プロフィールから依頼してください");
      return;
    }
    if (supportTopic === "other" && !supportTopicOther.trim()) {
      setError("その他の内容を入力してください");
      return;
    }
    if (!deadline) {
      setError("希望期限を入力してください");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("ログイン情報の取得に失敗しました。再読み込みして再試行してください。");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("ログインセッションが見つかりません。再ログインしてください。");
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/requests/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requesterId: sessionUserId,
          tutorId,
          supportTopic,
          supportTopicOther,
          supportMethod,
          estimatedDuration: duration,
          requestedDeadline: deadline,
          requestedPrice
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "依頼送信に失敗しました");
        return;
      }

      router.push(`/student/status/${data.requestId}`);
    } catch (error) {
      console.error("Failed to submit request", error);
      setError(error instanceof Error ? error.message : "依頼送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="card p-6">
          <p className="text-sm text-sea/70">依頼フォーム（{step}/5）</p>
          <h2 className="mt-1 text-2xl font-semibold text-sea">先輩への申請を作成</h2>
          <p className="mt-2 text-sm leading-7 text-sea/75">
            迷わないように、必要な項目を順番に整理しています。まず相談内容を決めて、最後に希望金額を確認します。
          </p>
          {tutorInfo && (
            <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-sea/80">
              依頼先: <span className="font-semibold">{tutorInfo.full_name}</span>
              {tutorInfo.school ? `（${tutorInfo.school}）` : ""}
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="grid gap-3 md:grid-cols-5">
            {stepItems.map((item) => {
              const active = step === item.no;
              const done = step > item.no;
              return (
                <div
                  key={item.no}
                  className={`rounded-2xl border px-4 py-4 ${
                    active
                      ? "border-emerald-200 bg-emerald-50"
                      : done
                        ? "border-sky-200 bg-sky-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                        active
                          ? "bg-[#10B981] text-white"
                          : done
                            ? "bg-sky-500 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.no}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card grid gap-5 p-6">
          {sessionRole === "tutor" && (
            <p className="rounded-xl border border-sand bg-cloud px-3 py-2 text-sm text-sea/80">
              大学生アカウントでは依頼を送信できません。高校生アカウントでログインしてください。
            </p>
          )}
          {step === 1 && (
            <div className="grid gap-3">
              <h3 className="text-lg font-semibold text-sea">① 何をして欲しいですか？</h3>
              {TOPICS.map((topic) => (
                <label key={topic.value} className="flex items-center gap-2 text-sm text-sea">
                  <input
                    type="radio"
                    name="topic"
                    checked={supportTopic === topic.value}
                    onChange={() => setSupportTopic(topic.value)}
                  />
                  {topic.label}
                </label>
              ))}
              {supportTopic === "other" && (
                <input
                  className="input"
                  placeholder="その他の内容を入力"
                  value={supportTopicOther}
                  onChange={(e) => setSupportTopicOther(e.target.value)}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3">
              <h3 className="text-lg font-semibold text-sea">② どんな方法で対応して欲しいですか？</h3>
              {METHODS.map((method) => (
                <label key={method.value} className="flex items-center gap-2 text-sm text-sea">
                  <input
                    type="radio"
                    name="method"
                    checked={supportMethod === method.value}
                    onChange={() => setSupportMethod(method.value)}
                  />
                  {method.label}
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3">
              <h3 className="text-lg font-semibold text-sea">③ どのくらい時間がかかりそうですか？</h3>
              {DURATIONS.map((item) => (
                <label key={item.value} className="flex items-center gap-2 text-sm text-sea">
                  <input
                    type="radio"
                    name="duration"
                    checked={duration === item.value}
                    onChange={() => setDuration(item.value)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              <h3 className="text-lg font-semibold text-sea">④ いつまでに対応して欲しいですか？</h3>
              <input className="input max-w-xs" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-3">
              <h3 className="text-lg font-semibold text-sea">⑤ 金額設定</h3>
              <p className="text-sm text-sea/75">
                同じような申請の平均は <span className="font-semibold text-sea">¥{suggestedPrice.toLocaleString()}</span> です。
              </p>
              <label className="grid max-w-xs gap-2">
                <span className="label">希望金額（円）</span>
                <input
                  className="input"
                  type="number"
                  min={1000}
                  step={500}
                  value={requestedPrice}
                  onChange={(e) => setRequestedPrice(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {error && <p className="text-sm text-accent">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || loading}>
              戻る
            </button>
            {step < 5 ? (
              <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(5, s + 1))} disabled={loading}>
                次へ
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onSubmit} disabled={loading || sessionRole !== "student"}>
                {loading ? "送信中..." : "依頼申請する"}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#10B981]">Summary</div>
          <h3 className="mt-2 text-lg font-bold text-slate-900">今の申請内容</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="text-slate-400">相談内容</div>
              <div className="mt-1 font-medium text-slate-800">{selectedTopicLabel}</div>
            </div>
            <div>
              <div className="text-slate-400">相談方法</div>
              <div className="mt-1 font-medium text-slate-800">{selectedMethodLabel}</div>
            </div>
            <div>
              <div className="text-slate-400">想定時間</div>
              <div className="mt-1 font-medium text-slate-800">{selectedDurationLabel}</div>
            </div>
            <div>
              <div className="text-slate-400">希望期限</div>
              <div className="mt-1 font-medium text-slate-800">{deadline || "未入力"}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-slate-500">おすすめの相場</div>
              <div className="mt-1 text-xl font-bold text-slate-900">¥{suggestedPrice.toLocaleString()}</div>
              <div className="text-xs text-slate-500">似た相談の平均価格をもとに表示しています。</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900">このあとどう進む？</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 px-4 py-3">1. 申請を送る</div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">2. 先輩が確認・承認</div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">3. 支払い完了後に専用チャット開始</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function RequestNewPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl card p-6 text-sm text-sea/70">読み込み中...</div>}>
      <RequestNewPageContent />
    </Suspense>
  );
}
