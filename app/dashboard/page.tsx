"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
  school: string | null;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [tutorVerificationStatus, setTutorVerificationStatus] = useState<"pending" | "approved" | "rejected" | "none">("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, school")
        .eq("id", session.user.id)
        .single();
      setProfile(data as Profile);

      const { data: tutorProfile } = await supabase
        .from("tutor_profiles")
        .select("avatar_url")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (tutorProfile?.avatar_url) setAvatarUrl(tutorProfile.avatar_url);

      if (data?.role === "tutor") {
        const { data: verification } = await supabase
          .from("tutor_verifications")
          .select("status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!verification?.status) setTutorVerificationStatus("none");
        else setTutorVerificationStatus(verification.status as "pending" | "approved" | "rejected");
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-sea">読み込み中...</p>;
  }

  if (!profile) {
    return (
      <div className="card p-6">
        <p className="text-sea">ログインが必要です。</p>
        <Link className="btn btn-primary mt-4" href="/auth/login">ログイン</Link>
      </div>
    );
  }

  const actions = {
    student: [
      { label: "依頼を作成", href: "/requests/new" },
      { label: "依頼一覧", href: "/requests" },
      { label: "進捗確認", href: "/student/status" }
    ],
    tutor: [
      { label: "依頼を探す", href: "/tutor/requests" },
      { label: "学生証認証ページ", href: "/verification/student-id" },
      { label: "チャットを開く", href: "/chat/demo" },
      { label: "取引管理", href: "/demo/request" }
    ],
    admin: [
      { label: "運営トップ", href: "/admin" },
      { label: "学生証審査管理", href: "/admin/verifications" },
      { label: "通報管理", href: "/admin/reports" }
    ]
  }[profile.role];

  const quickLinks = [
    { label: "学生認証ページ", href: "/verification/student-id" },
    { label: "運営管理画面", href: "/admin" },
    { label: "大学生画面", href: "/demo/request" },
    { label: "高校生画面", href: "/demo" },
    { label: "デバッグ画面", href: "/dev/debug" }
  ];

  return (
    <div className="grid gap-6">
      <header className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input className="input max-w-md" placeholder="検索" />
          <div className="flex items-center gap-3">
            <Link href="/profile/settings" className="h-10 w-10 rounded-xl border border-sand bg-cloud overflow-hidden grid place-items-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-sea/70">You</span>
              )}
            </Link>
          </div>
        </div>
      </header>
      <div className="card p-6">
        <h2 className="text-2xl font-semibold text-sea">ダッシュボード</h2>
        <p className="mt-2 text-sm text-sea/80">
          {profile.full_name}（{profile.role === "student" ? "高校生" : profile.role === "tutor" ? "大学生" : "運営"}）
        </p>
        {profile.school && <p className="text-sm text-sea/80">所属: {profile.school}</p>}
        {profile.role === "tutor" && (
          <p className="mt-2 text-sm text-sea/80">
            学生証審査ステータス:{" "}
            {tutorVerificationStatus === "approved"
              ? "承認済み"
              : tutorVerificationStatus === "pending"
                ? "審査中"
                : tutorVerificationStatus === "rejected"
                  ? "差し戻し"
                  : "未提出"}
          </p>
        )}
        {profile.role === "tutor" && tutorVerificationStatus !== "approved" && (
          <p className="mt-1 text-sm text-sea/70">
            学生証認証はあとで提出できます（現在は画面利用可能）。
          </p>
        )}
      </div>
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-sea">クイック遷移</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="card p-4 hover:shadow-md">
              <p className="font-semibold text-sea">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {actions.map((item) => (
          <Link key={item.href} href={item.href} className="card p-5 hover:shadow-md">
            <p className="font-semibold text-sea">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
