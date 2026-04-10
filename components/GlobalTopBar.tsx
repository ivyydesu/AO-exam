"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import BrandLogo, { BrandIcon } from "./BrandLogo";
import { getSupabaseClient } from "../lib/supabase/client";

type ProfileState = {
  name: string;
  email: string;
  roleLabel: string;
  avatarUrl: string;
  role: "student" | "tutor" | "admin";
  isGuest: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  is_read: boolean;
  created_at: string;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function navClass(active: boolean) {
  return active
    ? "px-3 py-2 text-[15px] font-semibold text-[#10B981]"
    : "px-3 py-2 text-[15px] font-semibold text-[#374151] transition hover:text-[#10B981]";
}

function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function GlobalTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<ProfileState>({
    name: "ログインしてください",
    email: "",
    roleLabel: "ゲスト",
    avatarUrl: "",
    role: "student",
    isGuest: true
  });

  useEffect(() => {
    const setGuest = () => {
      setProfile({
        name: "ログインしてください",
        email: "",
        roleLabel: "ゲスト",
        avatarUrl: "",
        role: "student",
        isGuest: true
      });
    };

    const load = async (session?: Session | null) => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const currentSession =
        session !== undefined
          ? session
          : (await supabase.auth.getSession()).data.session;

      const uid = currentSession?.user.id;
      const email = currentSession?.user.email ?? "";
      if (!uid) {
        setGuest();
        return;
      }

      const fallbackName =
        (currentSession?.user.user_metadata?.full_name as string | undefined) ||
        (currentSession?.user.email?.split("@")[0] ?? "ユーザー");
      const fallbackRole =
        (currentSession?.user.user_metadata?.role as "student" | "tutor" | "admin" | undefined) ?? "student";

      const [{ data: baseProfile, error: baseError }, { data: tutorProfile }] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("id", uid).maybeSingle(),
        supabase.from("tutor_profiles").select("avatar_url, nickname").eq("user_id", uid).maybeSingle()
      ]);

      if (baseError) {
        setProfile({
          name: fallbackName,
          email,
          roleLabel: fallbackRole === "tutor" ? "大学生" : fallbackRole === "admin" ? "運営" : "高校生",
          avatarUrl: tutorProfile?.avatar_url || "",
          role: fallbackRole,
          isGuest: false
        });
        return;
      }

      setProfile({
        name: (tutorProfile?.nickname ?? "").trim() || baseProfile?.full_name || fallbackName,
        email,
        roleLabel: baseProfile?.role === "tutor" ? "大学生" : baseProfile?.role === "admin" ? "運営" : "高校生",
        avatarUrl: tutorProfile?.avatar_url || "",
        role: (baseProfile?.role as "student" | "tutor" | "admin") || fallbackRole,
        isGuest: false
      });
    };

    const supabase = getSupabaseClient();
    if (!supabase) return;

    load().catch(setGuest);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session).catch(setGuest);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || profile.isGuest) {
        setNotificationItems([]);
        setUnreadCount(0);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/notifications/list?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = (json.items ?? []) as NotificationItem[];
      setNotificationItems(items);
      setUnreadCount(Number(json.unreadCount ?? 0));
    };

    void loadNotifications();
  }, [pathname, profile.isGuest]);

  const links = useMemo(() => {
    if (profile.isGuest) {
      return [
        { href: "/search", label: "先輩を探す", active: pathname.startsWith("/search") || pathname.startsWith("/service/") },
        { href: "/guide", label: "ユニブリについて", active: pathname.startsWith("/guide") }
      ];
    }

    if (profile.role === "admin") {
      return [{ href: "/admin", label: "運営管理", active: pathname.startsWith("/admin") }];
    }

    if (profile.role === "student") {
      return [
        { href: "/search", label: "先輩を探す", active: pathname.startsWith("/search") || pathname.startsWith("/service/") },
        { href: "/status", label: "申請状況", active: pathname.startsWith("/status") || pathname.startsWith("/demo/request") },
        { href: "/chat", label: "メッセージ", active: pathname.startsWith("/chat") }
      ];
    }

    return [
      { href: "/status", label: "申請状況", active: pathname.startsWith("/status") || pathname.startsWith("/demo/request") },
      { href: "/chat", label: "メッセージ", active: pathname.startsWith("/chat") }
    ];
  }, [pathname, profile.isGuest, profile.role]);

  useEffect(() => {
    const targets = ["/home", "/status", "/chat", "/notifications", "/profile/settings?tab=manage", "/profile/management"];
    for (const href of targets) {
      router.prefetch(href);
    }
  }, [router]);

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/auth/login");
  };

  if (pathname?.startsWith("/auth/")) {
    return null;
  }

  return (
    <header className="app-topbar relative z-40 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-[1220px] items-center justify-between gap-3 px-3 sm:gap-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-10">
          <BrandLogo href="/home" size="sm" textClassName="text-[15px] font-bold tracking-tight text-[#111827] sm:text-[17px]" />
          <nav className="hidden items-center gap-3 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={navClass(link.active)}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div
            className="relative"
            onMouseEnter={() => setNotificationOpen(true)}
            onMouseLeave={() => setNotificationOpen(false)}
          >
            <Link
              href="/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl text-[#374151] transition hover:bg-[#F9FAFB] hover:text-[#10B981] sm:h-12 sm:w-12"
              aria-label="通知"
            >
              <BellIcon />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />
              ) : null}
            </Link>

            {notificationOpen ? (
              <div className="absolute right-0 top-full z-50 w-80 pt-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-[#111827]">最新の通知</p>
                  </div>
                  <div className="space-y-1">
                    {notificationItems.slice(0, 3).map((item) => (
                      <Link
                        key={item.id}
                        href={item.href || "/notifications"}
                        className="block rounded-xl px-3 py-3 transition hover:bg-[#F9FAFB]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#111827]">{item.title}</p>
                          {!item.is_read ? <span className="mt-1 h-2 w-2 rounded-full bg-[#EF4444]" /> : null}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-[#6B7280]">{item.body}</p>
                        <p className="mt-1 text-[11px] text-[#9CA3AF]">{formatNotificationTime(item.created_at)}</p>
                      </Link>
                    ))}
                    {notificationItems.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-[#9CA3AF]">通知はまだありません。</p>
                    ) : null}
                  </div>
                  <div className="px-2 pt-1">
                    <Link
                      href="/notifications"
                      className="block rounded-xl px-3 py-3 text-sm font-medium text-[#10B981] transition hover:bg-[#F9FAFB]"
                    >
                      通知センターを見る
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="h-10 w-px bg-[#E5E7EB]" />

          <div
            className="relative pr-2"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button type="button" className="flex min-h-[52px] items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-[#F9FAFB] sm:min-h-[56px] sm:min-w-[172px] sm:gap-3 sm:px-3">
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-[12px] font-semibold text-[#6B7280]">{profile.roleLabel}</div>
                <div className="text-[15px] font-semibold text-[#374151]">{profile.name}</div>
              </div>
              <div className="h-9 w-9 overflow-hidden rounded-full border border-[#E5E7EB] bg-[#F3F4F6] sm:h-10 sm:w-10">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <BrandIcon size="sm" />
                  </div>
                )}
              </div>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-full z-50 w-56 pt-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                  <Link
                    href={profile.isGuest ? "/auth/login" : "/profile/settings?tab=manage"}
                    className="block rounded-xl px-4 py-3.5 text-[15px] font-medium text-[#374151] transition hover:bg-[#ECFDF5] hover:text-[#10B981]"
                  >
                    アカウント設定
                  </Link>
                  <Link
                    href={profile.isGuest ? "/auth/login" : profile.role === "admin" ? "/admin" : "/profile/management"}
                    className="block rounded-xl px-4 py-3.5 text-[15px] font-medium text-[#374151] transition hover:bg-[#ECFDF5] hover:text-[#10B981]"
                  >
                    管理ページ
                  </Link>
                  {profile.isGuest ? (
                    <Link
                      href="/auth/login"
                      className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] font-medium text-[#374151] transition hover:bg-[#ECFDF5] hover:text-[#10B981]"
                    >
                      ログイン
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={logout}
                      className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] font-medium text-[#374151] transition hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    >
                      ログアウト
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
