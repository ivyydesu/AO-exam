"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClient } from "../../../lib/demoClient";
import { getSupabaseClient } from "../../../lib/supabase/client";

type Tutor = {
  id: string;
  name: string;
  university: string;
  department: string;
  year: string;
  acceptedUniversities: string[];
  theme: string;
  experience: string;
  rating: number;
  reviews: number;
  avatar: string;
  seminar: string;
  bio: string;
};

const defaultAvatar = "/avatars/mentor.png";

const reviewItems = [
  {
    name: "佐藤 K. さん",
    meta: "高校3年生 / 法学部志望",
    text: "志望理由書の添削をお願いしました。自分では気づけなかった視点を指摘していただき、内容がとても深まりました。",
    stars: 5,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBeIy9jqCr9UytYtzzOGgcNkWpK6Cji5q3SEVaqR1m4uS4RBMNtnNQZ69JWkIgOcMpbwdj6nAzMowS2JYpBatduww0VsDejudrCcX4yBwuhguo-45LR-H1UqFK7yOoO8OqVSpblLPXGGcGzYm1MUOMgB5DecKKxwGauABzJh8c3XPy-P3ZcwvT7ziTWT56nCmGblZO6ms3mSL8YRmzFjamrgfQLlawKsNTLb6m_N5khMeQlptSCXGamWuz2rDgIhKl0s43PDg47fUQ"
  },
  {
    name: "田中 M. さん",
    meta: "高校2年生 / 探究活動中",
    text: "探究テーマがなかなか決まらず悩んでいましたが、木戸先輩との会話の中でやりたいことが見えてきました。",
    stars: 4,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA5gREnNzrxb8iYEAK0LeCpc4sSyG6hODt4QH22zKoYjYGIQPFLXfJLWSH-DGGpOP3QLiAkZKOupF5NHvTpw1BoMHb4xJeNzKVIIAktpNDn6kJjUC90HoJCLv_rtcFDhayygE1ksKTMO_3ULx-3aVWAy5vmhohjF81WGdCYuQBmM-hoELhuKbMLCMv7rPejzVQydEHtBqZJP6TZBD2zXCI8foPSfmC9x9INRfW5eU4jgFtRJ3-IvfqX-gpPF3Ie8BT8fXMbGH3DBJs"
  }
];

function parseBulletItems(raw: string, fallback: string[]) {
  const normalized = raw
    .split(/\r?\n|・|•|▪|●|;/)
    .map((line) => line.trim().replace(/^[-・•▪●]\s*/, ""))
    .filter(Boolean);
  if (normalized.length > 0) return normalized.slice(0, 4);
  return fallback;
}

export default function ServicePage({ params }: { params: { id: string } }) {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sessionRole, setSessionRole] = useState<"student" | "tutor" | "admin" | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      setSessionRole((profile?.role as "student" | "tutor" | "admin" | null) ?? null);
    };
    loadRole();
  }, []);

  useEffect(() => {
    const load = async () => {
      setNotFound(false);
      const supabase = getClient();
      if (supabase) {
        const { data } = await supabase.from("demo_tutors").select("*").eq("id", params.id).maybeSingle();
        if (data) {
          setTutor({
            id: data.id,
            name: data.name,
            university: data.university,
            department: data.department,
            year: data.year ?? "2年",
            acceptedUniversities: data.accepted_universities ?? [],
            theme: data.theme ?? "",
            experience: data.experience ?? "",
            rating: Number(data.rating ?? 0),
            reviews: Number(data.reviews ?? 0),
            avatar: data.avatar_url || defaultAvatar,
            seminar: data.seminar || "教育行政ゼミ",
            bio: data.bio ?? ""
          });
          return;
        }
      }

      try {
        const res = await fetch(`/api/tutors/${params.id}`);
        const payload = await res.json();
        if (!res.ok || !payload.item) {
          setNotFound(true);
          return;
        }
        const item = payload.item as {
          id: string;
          name: string;
          university: string;
          department: string;
          grade: string;
          school: string;
          researchTheme: string;
          coachingExperience: string;
          avatar: string;
          seminar: string;
          bio: string;
        };
        setTutor({
          id: item.id,
          name: item.name,
          university: item.university || "",
          department: item.department || "",
          year: item.grade || "",
          acceptedUniversities: item.school ? [item.school] : [],
          theme: item.researchTheme || "",
          experience: item.coachingExperience || "",
          rating: 5,
          reviews: 0,
          avatar: item.avatar || defaultAvatar,
          seminar: item.seminar || "教育行政ゼミ",
          bio: item.bio || ""
        });
      } catch {
        setNotFound(true);
      }
    };
    load();
  }, [params.id]);

  const startPrepayMessage = async () => {
    if (sendingMessage || !tutor) return;
    setSendingMessage(true);
    setMessageError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase初期化に失敗しました");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/auth/login";
        return;
      }
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tutorId: tutor.id })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.requestId) {
        throw new Error(payload?.error ?? "メッセージ開始に失敗しました");
      }
      window.location.href = `/chat?requestId=${payload.requestId}`;
    } catch (e) {
      setMessageError(e instanceof Error ? e.message : "メッセージ開始に失敗しました");
    } finally {
      setSendingMessage(false);
    }
  };

  if (!tutor && !notFound) {
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#FDFDFD]">
        <main className="mx-auto w-full max-w-[1600px] px-6 py-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
            先輩プロフィールを読み込み中です...
          </section>
        </main>
      </div>
    );
  }

  if (notFound || !tutor) {
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#FDFDFD]">
        <main className="mx-auto w-full max-w-[1600px] px-6 py-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
            先輩プロフィールが見つかりませんでした。
          </section>
        </main>
      </div>
    );
  }

  const themeItems = parseBulletItems(tutor.theme, ["探究テーマはプロフィールで設定してください"]);
  const experienceItems = parseBulletItems(tutor.experience, ["指導経験はプロフィールで設定してください"]);
  const intro = tutor.bio?.trim()
    ? tutor.bio
    : `こんにちは！${tutor.university}の${tutor.name}です。AO入試に向けて、あなたの強みを一緒に整理します。`;
  const dynamicTags = Array.from(
    new Set([tutor.department, tutor.seminar, ...themeItems].map((item) => item.trim()).filter(Boolean))
  ).slice(0, 4);

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#FDFDFD]">
      <main className="mx-auto w-full max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex items-center text-sm text-gray-500">
          <Link href="/demo" className="hover:text-[#FF8C66]">トップ</Link>
          <span className="mx-2">›</span>
          <Link href="/demo" className="hover:text-[#FF8C66]">メンター一覧</Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">{tutor?.name ?? "読み込み中..."}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-8 md:flex-row">
                <div className="w-full shrink-0 md:w-1/3">
                  <div className="group relative aspect-[3/4] overflow-hidden rounded-xl shadow-md">
                    <img alt={tutor.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={tutor.avatar} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div className="text-sm font-medium text-white">★ {tutor.rating} ({tutor.reviews}件)</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="mb-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">在籍確認済み</span>
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">トップ評価</span>
                      <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">返信が早い</span>
                    </div>
                    <h1 className="mb-1 text-3xl font-bold text-gray-900">{tutor.name}</h1>
                    <p className="text-lg font-medium text-[#FF8C66]">{tutor.university} {tutor.department} {tutor.year}</p>
                  </div>

                  <div className="mb-6 text-gray-600">
                    <p className="whitespace-pre-line">{intro}</p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="mb-1 block text-xs text-gray-500">所属ゼミ</span>
                      <span className="font-medium text-gray-800">{tutor.seminar}</span>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="mb-1 block text-xs text-gray-500">合格校</span>
                      <span className="font-medium text-gray-800">{tutor.acceptedUniversities[0] || "未設定"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">探究テーマ</h3>
                <ul className="space-y-3 text-gray-700">
                  {themeItems.map((item) => (
                    <li key={`theme-${item}`}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">指導経験・実績</h3>
                <ul className="space-y-3 text-gray-700">
                  {experienceItems.map((item) => (
                    <li key={`exp-${item}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f9f74]">How It Works</p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">この先輩に相談するときの流れ</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    「いきなり予約は少し不安」という高校生でも迷わないように、まず質問してから予約できる形にしています。
                    相談前に雰囲気をつかんで、納得してから次に進めます。
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm">
                  <div className="font-semibold text-gray-900">向いている人</div>
                  <div className="mt-2 space-y-1">
                    <div>・志望理由書の方向性を整理したい</div>
                    <div>・大学のリアルな雰囲気を聞きたい</div>
                    <div>・探究テーマの話し方を磨きたい</div>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { step: "1", title: "まず質問する", desc: "不安な点や相談したい内容を、決済前メッセージで先に確認できます。" },
                  { step: "2", title: "予約・支払い", desc: "内容が合いそうなら依頼を送り、承認後に支払いへ進みます。" },
                  { step: "3", title: "専用チャット開始", desc: "支払い完了後は専用チャットと必要に応じて通話ルームが使えます。" }
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-full bg-[#10B981] font-bold text-white">{item.step}</div>
                      <div className="font-semibold text-gray-900">{item.title}</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">先輩へのレビュー</h3>
              </div>
              <div className="space-y-6">
                {reviewItems.map((review) => (
                  <div key={review.name} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img alt={review.name} className="h-10 w-10 rounded-full object-cover" src={review.avatar} />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{review.name}</div>
                          <div className="text-xs text-gray-500">{review.meta}</div>
                        </div>
                      </div>
                      <div className="text-sm text-yellow-400">{"★".repeat(review.stars)}<span className="text-gray-300">{"★".repeat(5 - review.stars)}</span></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{review.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="relative lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">相談・指導を依頼</h3>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">¥3,000</span>
                    <span className="text-sm text-gray-500">/ 60分</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-green-600">初回相談は無料でお試し可能</p>
                </div>

                {sessionRole === "tutor" ? (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">大学生アカウントでは依頼できません。</p>
                ) : (
                  <Link
                    href={`/requests/new?tutorId=${tutor.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF8C66] px-4 py-3.5 font-bold text-white transition hover:bg-[#FF7A4D]"
                  >
                    相談内容を送る
                  </Link>
                )}

                <button
                  onClick={() => void startPrepayMessage()}
                  disabled={sessionRole === "tutor" || sendingMessage}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingMessage ? "送信中..." : "まず質問する"}
                </button>
                {messageError ? (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {messageError}
                  </p>
                ) : null}
                <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">相談前に分かること</div>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <div>・今すぐ質問できるか</div>
                    <div>・オンライン対応か文章相談か</div>
                    <div>・支払い後に専用チャットへ切り替わる流れ</div>
                  </div>
                </div>
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">対応可能なタグ</div>
                  <div className="flex flex-wrap gap-2">
                    {dynamicTags.map((tag) => (
                      <span key={`tag-${tag}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        #{tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div>
                  <h4 className="mb-1 text-sm font-bold text-blue-800">安心・安全な取引</h4>
                  <p className="text-xs leading-snug text-blue-700">
                    本人確認済みユーザーのみが利用可能です。お支払いは運営がお預かりし、指導完了後に支払われます。
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
