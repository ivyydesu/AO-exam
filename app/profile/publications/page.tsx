"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";
import DemoTopNav from "../../../components/DemoTopNav";

type Publication = {
  user_id: string;
  avatar_url: string | null;
  university: string;
  department: string;
  seminar: string;
  grade: string;
  research_theme: string;
  coaching_experience: string;
  bio: string;
  is_published?: boolean;
};

export default function ProfilePublicationsPage() {
  const [item, setItem] = useState<Publication | null>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, school")
        .eq("id", uid)
        .maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.school) setSchool(profile.school);

      const { data, error: qError } = await supabase
        .from("tutor_profiles")
        .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
        .eq("user_id", uid)
        .maybeSingle();
      if (qError) {
        setError(qError.message);
        return;
      }
      setItem((data as Publication | null) ?? null);
    };
    load();
  }, []);

  return (
    <div className="grid gap-6">
      <DemoTopNav />
      <div className="card p-6">
        <h2 className="text-2xl font-semibold text-sea">プロフィール情報</h2>
        <p className="mt-1 text-sm text-sea/70">自分の公開している先輩プロフィール</p>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      {!item ? (
        <div className="card p-6 grid gap-3">
          <p className="text-sea/75">まだプロフィールがありません。</p>
          <Link className="btn btn-primary w-fit" href="/profile/settings">
            プロフィールを作成する
          </Link>
        </div>
      ) : (
        <div className="card p-6 grid gap-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-cloud border border-sand">
              {item.avatar_url && <img src={item.avatar_url} alt="avatar" className="h-full w-full object-cover" />}
            </div>
            <div>
              <p className="text-lg font-semibold text-ink">{name || "名前未設定"}</p>
              <p className="text-sm text-sea/70">{school || "学校未設定"}</p>
              <p className={`mt-1 text-xs ${item.is_published ? "text-emerald-700" : "text-sea/60"}`}>
                {item.is_published ? "公開中" : "非公開"}
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-sea/80">
            <p>大学: {item.university || "-"}</p>
            <p>学部: {item.department || "-"}</p>
            <p>ゼミ: {item.seminar || "-"}</p>
            <p>学年: {item.grade || "-"}</p>
            <p>探究テーマ: {item.research_theme || "-"}</p>
            <p>指導経験: {item.coaching_experience || "-"}</p>
            <p>自己紹介: {item.bio || "-"}</p>
          </div>
          <Link className="btn btn-secondary w-fit" href="/profile/settings">
            設定を編集
          </Link>
        </div>
      )}
    </div>
  );
}

