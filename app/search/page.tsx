"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TutorSearchItem = {
  id: string;
  name: string;
  school: string;
  avatar: string;
  university: string;
  department: string;
  seminar: string;
  grade: string;
  researchTheme: string;
  coachingExperience: string;
  bio: string;
  isPublished: boolean;
};

const gradeOptions = ["", "1年", "2年", "3年", "4年", "修士1年", "修士2年"];

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [seminar, setSeminar] = useState("");
  const [university, setUniversity] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TutorSearchItem[]>([]);

  const loadTutors = async () => {
    const hasCondition = Boolean(seminar.trim() || university.trim() || keyword.trim() || grade.trim());
    if (!hasCondition) {
      setItems([]);
      setError("検索条件を1つ以上入力してください。");
      setSearchedOnce(true);
      return;
    }

    setLoading(true);
    setError(null);
    setSearchedOnce(true);
    try {
      const params = new URLSearchParams();
      if (seminar.trim()) params.set("seminar", seminar.trim());
      if (university.trim()) params.set("university", university.trim());
      if (keyword.trim()) params.set("researchTheme", keyword.trim());
      if (grade.trim()) params.set("grade", grade.trim());

      const res = await fetch(`/api/tutors/search?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "先輩一覧の取得に失敗しました");

      const nextItems = ((payload.items ?? []) as TutorSearchItem[]).filter((item) => item.isPublished === true);
      setItems(nextItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : "先輩一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const filteredCountLabel = useMemo(() => `${items.length}件`, [items.length]);
  const hasAnyCondition = Boolean(seminar.trim() || university.trim() || keyword.trim() || grade.trim());

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-8">
      <header className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#10B981]">Search</p>
        <h1 className="mt-3 text-4xl font-bold text-[#111827]">先輩検索</h1>
        <p className="mt-3 text-base text-[#6B7280]">
          公開プロフィールの先輩のみ表示しています。条件を入れて、あなたに合う先輩を探せます。
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#111827]">絞り込み</h2>
            <button
              type="button"
              className="text-sm font-medium text-[#10B981]"
              onClick={() => {
                setKeyword("");
                setSeminar("");
                setUniversity("");
                setGrade("");
                setItems([]);
                setSearchedOnce(false);
                setError(null);
              }}
            >
              クリア
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">キーワード</span>
              <input
                className="rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                placeholder="探究テーマ・自己紹介"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">ゼミ</span>
              <input
                className="rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                placeholder="例: 教育行政ゼミ"
                value={seminar}
                onChange={(e) => setSeminar(e.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">大学・学部</span>
              <input
                className="rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                placeholder="例: 成蹊大学 法学部"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#374151]">学年</span>
              <select
                className="rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {gradeOptions.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option || "すべて"}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="mt-2 rounded-xl bg-[#10B981] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d9f72]"
              onClick={() => void loadTutors()}
            >
              検索する
            </button>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-[#111827]">検索結果</h2>
              <p className="text-sm text-[#6B7280]">
                {searchedOnce ? `現在 ${filteredCountLabel} の先輩を表示中` : "条件を入力して「検索する」を押してください"}
              </p>
            </div>
            <Link href="/home" className="rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151]">
              デモへ戻る
            </Link>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 text-sm text-[#6B7280] shadow-sm">
              読み込み中...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          ) : !searchedOnce ? (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 text-sm text-[#6B7280] shadow-sm">
              まだ検索は実行されていません。左の条件を入力して検索してください。
            </div>
          ) : hasAnyCondition && items.length === 0 ? (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 text-sm text-[#6B7280] shadow-sm">
              条件に一致する先輩がいません。
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4 p-5">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F3F4F6]">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-bold text-[#111827]">{item.name}</h3>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">公開中</span>
                      </div>
                      <p className="mt-1 text-sm text-[#374151]">{item.university} {item.department}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">{item.grade || "学年未設定"} / {item.seminar || "ゼミ未設定"}</p>
                    </div>
                  </div>

                  <div className="border-t border-[#F3F4F6] px-5 py-4">
                    <div className="grid gap-3 text-sm text-[#374151]">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">探究テーマ</p>
                        <p className="line-clamp-2">{item.researchTheme || "未設定"}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">指導経験</p>
                        <p className="line-clamp-2">{item.coachingExperience || "未設定"}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">自己紹介</p>
                        <p className="line-clamp-3 text-[#6B7280]">{item.bio || "未設定"}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs text-[#9CA3AF]">{item.school || "学校情報なし"}</span>
                      <Link
                        href={`/service/${item.id}`}
                        className="rounded-xl bg-[#10B981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d9f72]"
                      >
                        詳細を見る
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
