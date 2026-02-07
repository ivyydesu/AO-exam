"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
  school: string | null;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
      { label: "依頼一覧", href: "/requests" }
    ],
    tutor: [
      { label: "依頼を探す", href: "/requests" },
      { label: "チャットを開く", href: "/chat/demo" }
    ],
    admin: [
      { label: "全依頼を確認", href: "/requests" },
      { label: "レポート", href: "/dashboard" }
    ]
  }[profile.role];

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold text-sea">ダッシュボード</h2>
        <p className="mt-2 text-sm text-sea/80">
          {profile.full_name}（{profile.role === "student" ? "高校生" : profile.role === "tutor" ? "大学生" : "運営"}）
        </p>
        {profile.school && <p className="text-sm text-sea/80">所属: {profile.school}</p>}
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
