"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getClient } from "../../../lib/demoClient";
import { getSupabaseClient } from "../../../lib/supabase/client";
import ReportDialog from "../../../components/ReportDialog";

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
};

const fallbackTutors: Record<string, Tutor> = {
  "tutor-1": {
    id: "tutor-1",
    name: "木戸 洵成",
    university: "成蹊大学",
    department: "法学部政治学科",
    year: "2年",
    acceptedUniversities: ["成蹊大学 法学部政治学科"],
    theme: "教育行政といじめ問題について",
    experience: "個人的なサポートで成蹊大学法学部に3名合格",
    rating: 4.9,
    reviews: 12,
    avatar: "/avatars/mentor.png",
    seminar: "教育行政ゼミ"
  }
};

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

export default function ServicePage({ params }: { params: { id: string } }) {
  const [tutor, setTutor] = useState<Tutor>(fallbackTutors[params.id] ?? fallbackTutors["tutor-1"]);
  const [sessionRole, setSessionRole] = useState<"student" | "tutor" | "admin" | null>(null);

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
            avatar: data.avatar_url || fallbackTutors["tutor-1"].avatar,
            seminar: data.seminar || "教育行政ゼミ"
          });
          return;
        }
      }

      try {
        const res = await fetch(`/api/tutors/${params.id}`);
        const payload = await res.json();
        if (!res.ok || !payload.item) return;
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
          avatar: item.avatar || fallbackTutors["tutor-1"].avatar,
          seminar: item.seminar || "教育行政ゼミ"
        });
      } catch {
        // no-op
      }
    };
    load();
  }, [params.id]);

  const stars = useMemo(() => Array.from({ length: 5 }, (_, i) => i < Math.round(tutor.rating)), [tutor.rating]);

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#FDFDFD]">
      <main className="mx-auto w-full max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex items-center text-sm text-gray-500">
          <Link href="/demo" className="hover:text-[#FF8C66]">トップ</Link>
          <span className="mx-2">›</span>
          <Link href="/demo" className="hover:text-[#FF8C66]">メンター一覧</Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">{tutor.name}</span>
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
                    <p>
                      こんにちは！{tutor.university}の{tutor.name}です。高校時代は探究活動に熱中していました。{tutor.theme}
                      一緒にあなたの強みを言語化し、AO入試で伝わる形に整えます。
                    </p>
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
                  <li>• 教育行政といじめ問題について</li>
                  <li>• 若者の政治参加とSNSの影響</li>
                  <li>• 地域コミュニティにおける学生の役割</li>
                </ul>
              </div>
              <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">指導経験・実績</h3>
                <ul className="space-y-3 text-gray-700">
                  <li>• {tutor.experience}</li>
                  <li>• 志望理由書の添削経験多数</li>
                  <li>• 面接練習の壁打ち相手として好評</li>
                </ul>
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
                    相談を予約する
                  </Link>
                )}

                <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50">
                  メッセージを送る
                </button>
                <div className="mt-3">
                  <ReportDialog
                    reportType="user"
                    targetUserId={tutor.id}
                    triggerLabel="この先輩を通報する"
                    triggerClassName="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 font-medium text-[#B91C1C] transition hover:bg-[#FDE8E8]"
                  />
                </div>

                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">対応可能なタグ</div>
                  <div className="flex flex-wrap gap-2">
                    {tutor.theme ? (
                      <>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">#法学</span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">#志望理由書</span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">#面接</span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">#教育行政</span>
                      </>
                    ) : null}
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
