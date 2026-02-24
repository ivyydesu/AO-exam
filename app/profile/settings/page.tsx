"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";

type TutorForm = {
  full_name: string;
  school: string;
  avatar_url: string;
  university: string;
  department: string;
  seminar: string;
  grade: string;
  research_theme: string;
  coaching_experience: string;
  bio: string;
  is_published: boolean;
};

const initialForm: TutorForm = {
  full_name: "",
  school: "",
  avatar_url: "",
  university: "",
  department: "",
  seminar: "",
  grade: "",
  research_theme: "",
  coaching_experience: "",
  bio: "",
  is_published: false
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<TutorForm>(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [lineConnected, setLineConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const lineStatus = new URLSearchParams(window.location.search).get("line");
      if (lineStatus === "connected") setNotice("LINE連携が完了しました。");
      if (lineStatus?.startsWith("error")) setError(`LINE連携に失敗しました: ${lineStatus}`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("line_user_id")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();
      setLineConnected(Boolean(profile?.line_user_id));

      const res = await fetch("/api/profile/tutor", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      const payload = await res.json();
      if (!res.ok || !payload.profile) return;
      setForm(payload.profile as TutorForm);
    };
    load();
  }, []);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const fd = new FormData();
      fd.append("full_name", form.full_name);
      fd.append("school", form.school);
      fd.append("university", form.university);
      fd.append("department", form.department);
      fd.append("seminar", form.seminar);
      fd.append("grade", form.grade);
      fd.append("research_theme", form.research_theme);
      fd.append("coaching_experience", form.coaching_experience);
      fd.append("bio", form.bio);
      fd.append("is_published", String(form.is_published));
      if (avatarFile) fd.append("avatar", avatarFile);

      const res = await fetch("/api/profile/tutor", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: fd
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "保存に失敗しました");
      setNotice("プロフィールを保存しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const onTogglePublish = async () => {
    setError(null);
    setNotice(null);
    setPublishing(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");
      const next = !form.is_published;
      const res = await fetch("/api/profile/tutor/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ isPublished: next })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "公開状態の更新に失敗しました");
      setForm((prev) => ({ ...prev, is_published: next }));
      setNotice(next ? "プロフィールを公開しました。先輩一覧に表示されます。" : "プロフィールを非公開にしました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setPublishing(false);
    }
  };

  const onLogout = async () => {
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase client is not initialized");
      return;
    }
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const connectLine = async () => {
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");
      const res = await fetch("/api/line/connect/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ returnTo: "/profile/settings" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.authUrl) {
        throw new Error(payload.error ?? "LINE連携の開始に失敗しました");
      }
      window.location.href = payload.authUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "LINE連携に失敗しました");
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[28px] bg-white shadow-soft border border-sand overflow-hidden">
        <div className="grid md:grid-cols-[72px_1fr]">
          <aside className="bg-cloud/70 border-r border-sand min-h-[720px] py-6 grid content-start gap-5 place-items-center">
            {["◼", "◯", "⌘", "✉", "⚙"].map((icon) => (
              <div key={icon} className="h-9 w-9 rounded-xl bg-white grid place-items-center text-sea/70 border border-sand">
                {icon}
              </div>
            ))}
          </aside>
          <section className="p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold text-ink">プロフィール設定</p>
                <p className="text-sm text-sea/60 mt-1">大学生プロフィール登録（検索対象）</p>
              </div>
              <div className="flex items-center gap-3">
                <input className="input w-64" placeholder="Search" />
                <Link href="/dashboard" className="h-10 w-10 rounded-xl overflow-hidden border border-sand bg-cloud grid place-items-center">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-sea/70">You</span>
                  )}
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-sand">
              <div className="h-24 bg-gradient-to-r from-[#BCD9FF] via-[#E7EDF8] to-[#F7F0D8]" />
              <form className="p-6 grid gap-5" onSubmit={onSave}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-cloud border border-sand">
                      {avatarFile ? (
                        <img src={URL.createObjectURL(avatarFile)} alt="new avatar" className="h-full w-full object-cover" />
                      ) : form.avatar_url ? (
                        <img src={form.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">{form.full_name || "名前未設定"}</p>
                      <p className="text-sm text-sea/60">{form.school || "学校未設定"}</p>
                    </div>
                  </div>
                  <label className="btn btn-secondary cursor-pointer">
                    写真を変更
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="button"
                    className={`btn ${form.is_published ? "btn-secondary" : "btn-primary"}`}
                    onClick={onTogglePublish}
                    disabled={publishing}
                  >
                    {publishing ? "更新中..." : form.is_published ? "公開中（クリックで非公開）" : "公開する"}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="grid gap-2">
                    <span className="label">氏名</span>
                    <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="label">学校名</span>
                    <input className="input" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="label">大学</span>
                    <input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="label">学部</span>
                    <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="label">ゼミ</span>
                    <input className="input" value={form.seminar} onChange={(e) => setForm({ ...form, seminar: e.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="label">学年</span>
                    <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                      <option value="">選択</option>
                      <option value="1年">1年</option>
                      <option value="2年">2年</option>
                      <option value="3年">3年</option>
                      <option value="4年">4年</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="label">探究テーマ</span>
                    <input className="input" value={form.research_theme} onChange={(e) => setForm({ ...form, research_theme: e.target.value })} />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="label">指導経験</span>
                  <textarea className="input min-h-[88px]" value={form.coaching_experience} onChange={(e) => setForm({ ...form, coaching_experience: e.target.value })} />
                </label>
                <label className="grid gap-2">
                  <span className="label">自己紹介</span>
                  <textarea className="input min-h-[88px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </label>

                <div className="rounded-xl border border-sand bg-cloud p-4">
                  <p className="text-sm font-semibold text-sea">LINE連携（通知用）</p>
                  <p className="mt-1 text-xs text-sea/70">
                    状態: {lineConnected ? "連携済み" : "未連携"}
                  </p>
                  {!lineConnected && (
                    <button type="button" className="btn btn-secondary mt-3" onClick={connectLine}>
                      LINEを連携する
                    </button>
                  )}
                </div>

                {error && <p className="text-sm text-accent">{error}</p>}
                {notice && <p className="text-sm text-sea">{notice}</p>}

                <div className="flex gap-3">
                  <button className="btn btn-primary" disabled={loading}>
                    {loading ? "保存中..." : "保存"}
                  </button>
                  <Link href="/dashboard" className="btn btn-secondary">戻る</Link>
                  <button type="button" className="btn border border-sea text-sea" onClick={onLogout}>
                    ログアウト
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
