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
  const base: Record<string, number> = { "15m": 3000, "30m": 5000, "60m": 9000, "120m": 15000, "180m": 22000 };
  const topicBoost = topic === "essay_review" ? 2000 : topic === "interview_prep" ? 3000 : 0;
  const methodBoost = method === "online_mtg" ? 2000 : 0;
  return Math.max(3000, (base[duration] ?? 5000) + topicBoost + methodBoost);
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

    setLoading(true);
    const response = await fetch("/api/requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "依頼送信に失敗しました");
      return;
    }
    router.push(`/student/status/${data.requestId}`);
  };

  return (
    <div className="mx-auto max-w-3xl grid gap-6">
      <div className="card p-6">
        <p className="text-sm text-sea/70">依頼フォーム（{step}/5）</p>
        <h2 className="text-2xl font-semibold text-sea mt-1">先輩への申請を作成</h2>
        {tutorInfo && (
          <p className="mt-2 text-sm text-sea/75">
            依頼先: {tutorInfo.full_name} {tutorInfo.school ? `(${tutorInfo.school})` : ""}
          </p>
        )}
      </div>

      <div className="card p-6 grid gap-5">
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
            <label className="grid gap-2 max-w-xs">
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
  );
}

export default function RequestNewPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl card p-6 text-sm text-sea/70">読み込み中...</div>}>
      <RequestNewPageContent />
    </Suspense>
  );
}
