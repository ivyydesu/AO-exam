"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

type Props = {
  active?: "status" | "none";
};

export default function DemoTopNav({ active = "none" }: Props) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [name, setName] = useState("ユーザー");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
      const { data: tutorProfile } = await supabase
        .from("tutor_profiles")
        .select("avatar_url")
        .eq("user_id", uid)
        .maybeSingle();
      if (tutorProfile?.avatar_url) setAvatarUrl(tutorProfile.avatar_url);
    };
    load();
  }, []);

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const itemClass = (key: Props["active"]) =>
    `rounded-lg px-3 py-2 transition ${active === key ? "bg-sea text-white" : "text-sea/75 hover:bg-cloud hover:text-sea"}`;

  return (
    <header className="rounded-3xl bg-white/95 shadow-sm border border-sand">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-6 py-4">
        <Link href="/demo" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent text-white grid place-items-center font-bold">AO</div>
          <p className="text-xl font-semibold text-ink">AO Match</p>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/status" className={itemClass("status")}>取引管理</Link>
          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className="h-9 w-9 rounded-full bg-sand/70 border border-sand overflow-hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-sea/70">👤</span>
              )}
            </button>
            <div
              className={`absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-sand bg-white p-3 shadow-lg ${
                menuOpen ? "block" : "hidden"
              }`}
            >
              <p className="text-sm font-semibold text-sea">{name}</p>
              <div className="mt-2 grid gap-2 text-sm text-sea/80">
                <Link href="/profile/publications" className="hover:text-accent">プロフィール情報</Link>
                <Link href="/profile/settings" className="hover:text-accent">設定</Link>
                <Link href="/demo/request" className="hover:text-accent">アナライズ</Link>
                <button onClick={logout} className="text-left hover:text-accent">ログアウト</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
