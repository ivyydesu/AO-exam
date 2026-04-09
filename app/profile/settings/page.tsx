"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase/client";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings
} from "../../../lib/notificationSettings";
import {
  EMAIL_SEND_COOLDOWN_SECONDS,
  getCooldownRemaining,
  normalizeAuthErrorMessage,
  startCooldown
} from "../../../lib/auth/emailThrottle";

type TabKey = "manage" | "profile" | "notifications" | "login";

type TutorForm = {
  full_name: string;
  nickname: string;
  school: string;
  avatar_url: string;
  cover_url: string;
  department: string;
  seminar: string;
  grade: string;
  research_theme: string;
  coaching_experience: string;
  bio: string;
  is_published: boolean;
};

type VerificationStatus = {
  status: "pending" | "approved" | "rejected" | null;
  reason: string | null;
  admission_year: number | null;
  graduation_year: number | null;
};

const initialForm: TutorForm = {
  full_name: "",
  nickname: "",
  school: "",
  avatar_url: "",
  cover_url: "",
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
  const [tab, setTab] = useState<TabKey>("profile");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState<"student" | "tutor" | "admin">("student");

  const [form, setForm] = useState<TutorForm>(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [verification, setVerification] = useState<VerificationStatus>({
    status: null,
    reason: null,
    admission_year: null,
    graduation_year: null
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingLine, setLoadingLine] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingEmailChange, setLoadingEmailChange] = useState(false);
  const [emailChangeCooldown, setEmailChangeCooldown] = useState(0);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePending, setEmailChangePending] = useState(false);
  const [emailChangeCode, setEmailChangeCode] = useState("");

  useEffect(() => {
    // Prefetch related routes to reduce perceived delay when users move between settings pages.
    const routes = [
      "/profile/settings?tab=manage",
      "/profile/settings?tab=profile",
      "/profile/settings?tab=notifications",
      "/profile/settings?tab=login",
      "/verification/student-id",
      "/profile/payouts",
      "/profile/management"
    ];
    for (const href of routes) {
      router.prefetch(href);
    }
  }, [router]);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("tab");
    if (raw === "manage" || raw === "profile" || raw === "notifications" || raw === "login") {
      setTab(raw);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "profile");
      window.history.replaceState({}, "", url.toString());
      setTab("profile");
    }

    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase client is not initialized");

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          window.location.href = "/auth/login";
          return;
        }
        setEmail(sessionData.session.user.email ?? "");

        const token = sessionData.session.access_token;
        const [profileRes, settingsRes, verificationRes] = await Promise.all([
          fetch("/api/profile/tutor", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/notification-settings", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/verification/student-id", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const profilePayload = await profileRes.json().catch(() => ({}));
        if (profileRes.ok && profilePayload.profile) {
          setForm((prev) => ({ ...prev, ...(profilePayload.profile as TutorForm) }));
          setUserRole((profilePayload.profile.role as "student" | "tutor" | "admin") ?? "student");
        }

        const settingsPayload = await settingsRes.json().catch(() => ({}));
        if (settingsRes.ok && settingsPayload.settings) {
          const next = settingsPayload.settings as NotificationSettings;
          setSettings(next);
          setDraftSettings(next);
        }

        const verificationPayload = await verificationRes.json().catch(() => ({}));
        if (verificationRes.ok && verificationPayload.verification) {
          setVerification({
            status: verificationPayload.verification.status ?? null,
            reason: verificationPayload.verification.reason ?? null,
            admission_year: verificationPayload.verification.admission_year ?? null,
            graduation_year: verificationPayload.verification.graduation_year ?? null
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    setEmailChangeCooldown(getCooldownRemaining("settings-email-change", newEmail));
  }, [newEmail]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setEmailChangeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : form.avatar_url), [avatarFile, form.avatar_url]);
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : form.cover_url), [coverFile, form.cover_url]);

  const setTabAndQuery = (next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url.toString());
    setNotice(null);
    setError(null);
  };

  const authToken = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client is not initialized");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("ログインが必要です");
    return data.session.access_token;
  };

  const onSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoadingProfile(true);
    setError(null);
    setNotice(null);
    try {
      const token = await authToken();
      const fd = new FormData();
      fd.append("full_name", form.full_name);
      fd.append("nickname", form.nickname);
      fd.append("school", form.school);
      fd.append("department", form.department);
      fd.append("seminar", form.seminar);
      fd.append("grade", form.grade);
      fd.append("research_theme", form.research_theme);
      fd.append("coaching_experience", form.coaching_experience);
      fd.append("bio", form.bio);
      fd.append("is_published", String(form.is_published));
      if (avatarFile) fd.append("avatar", avatarFile);
      if (coverFile) fd.append("cover", coverFile);

      const res = await fetch("/api/profile/tutor", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "プロフィール保存に失敗しました");

      setForm((prev) => ({
        ...prev,
        avatar_url: payload?.profile?.avatar_url ? `${payload.profile.avatar_url}?t=${Date.now()}` : prev.avatar_url,
        cover_url: payload?.profile?.cover_url ? `${payload.profile.cover_url}?t=${Date.now()}` : prev.cover_url
      }));

      setAvatarFile(null);
      setCoverFile(null);
      setNotice("プロフィールを保存しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "プロフィール保存に失敗しました");
    } finally {
      setLoadingProfile(false);
    }
  };

  const onSaveBasicProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoadingProfile(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("ログインが必要です");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          school: form.school.trim()
        })
        .eq("id", data.session.user.id);

      if (updateError) throw new Error(updateError.message);
      setNotice("プロフィールを保存しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "プロフィール保存に失敗しました");
    } finally {
      setLoadingProfile(false);
    }
  };

  const onTogglePublish = async () => {
    setLoadingPublish(true);
    setError(null);
    setNotice(null);
    try {
      const token = await authToken();
      const next = !form.is_published;
      const res = await fetch("/api/profile/tutor/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPublished: next })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "公開設定の更新に失敗しました");

      setForm((prev) => ({ ...prev, is_published: next }));
      setNotice(next ? "プロフィールを公開しました" : "プロフィールを非公開にしました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "公開設定の更新に失敗しました");
    } finally {
      setLoadingPublish(false);
    }
  };

  const saveNotificationSettings = async () => {
    setLoadingSettings(true);
    setError(null);
    setNotice(null);
    try {
      const token = await authToken();
      const res = await fetch("/api/profile/notification-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(draftSettings)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "通知設定の保存に失敗しました");

      setSettings(draftSettings);
      setNotice("通知設定を保存しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "通知設定の保存に失敗しました");
    } finally {
      setLoadingSettings(false);
    }
  };

  const resetNotificationSettings = () => {
    setDraftSettings(settings);
    setNotice(null);
    setError(null);
  };

  const sendEmailChangeCode = async () => {
    setLoadingEmailChange(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      if (!newEmail) throw new Error("新しいメールアドレスを入力してください");
      if (newEmail === email) throw new Error("現在と異なるメールアドレスを入力してください");
      if (emailChangeCooldown > 0) throw new Error(`再送まで${emailChangeCooldown}秒お待ちください`);

      const { error: updateError } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/profile/settings?tab=login` }
      );
      if (updateError) throw new Error(updateError.message);

      startCooldown("settings-email-change", newEmail);
      setEmailChangeCooldown(EMAIL_SEND_COOLDOWN_SECONDS);
      setEmailChangePending(true);
      setNotice("メールアドレス変更用の確認コードを送信しました。認証コードを入力してください。");
    } catch (e) {
      setError(normalizeAuthErrorMessage(e instanceof Error ? e.message : "メール変更コード送信に失敗しました"));
    } finally {
      setLoadingEmailChange(false);
    }
  };

  const verifyEmailChangeCode = async () => {
    setLoadingEmailChange(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      if (!newEmail) throw new Error("新しいメールアドレスを入力してください");
      if (!emailChangeCode) throw new Error("確認コードを入力してください");

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: emailChangeCode,
        type: "email_change"
      });
      if (verifyError) throw new Error(verifyError.message);

      setEmail(data.user?.email ?? newEmail);
      setNewEmail("");
      setEmailChangeCode("");
      setEmailChangePending(false);
      setNotice("メールアドレスを変更しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "メールアドレス確認に失敗しました");
    } finally {
      setLoadingEmailChange(false);
    }
  };

  const connectLine = async () => {
    setLoadingLine(true);
    setError(null);
    try {
      const token = await authToken();
      const res = await fetch("/api/line/connect/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ returnTo: "/profile/settings?tab=notifications" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.authUrl) throw new Error(payload.error ?? "LINE連携を開始できません");
      window.location.href = payload.authUrl as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "LINE連携に失敗しました");
      setLoadingLine(false);
    }
  };

  const onSavePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoadingPassword(true);
    setError(null);
    setNotice(null);
    try {
      if (!newPassword || !confirmPassword) throw new Error("新しいパスワードを入力してください");
      if (newPassword !== confirmPassword) throw new Error("新しいパスワードが一致していません");
      if (passwordStrength.score < 3) throw new Error("パスワード強度が不足しています");

      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("パスワードを更新しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "パスワード更新に失敗しました");
    } finally {
      setLoadingPassword(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  if (!ready) {
    return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">読み込み中...</div>;
  }

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="min-h-[100dvh] overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <main className="min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB]/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div>
            <h1 id="profile-tab" className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl md:text-4xl">
              {tab === "manage"
                ? "設定"
                : tab === "profile"
                  ? "プロフィール設定"
                  : tab === "notifications"
                    ? "通知設定"
                    : "ログイン情報設定"}
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              {tab === "manage"
                ? "アカウント設定メニューです"
                : tab === "profile"
                ? "大学生プロフィール登録（検索対象）"
                : tab === "notifications"
                  ? "通知の受け取り方とLINE連携を管理"
                  : "メールアドレス・パスワードを管理"}
            </p>
          </div>
          {tab !== "manage" ? (
            <button
              type="button"
              onClick={() => setTabAndQuery("manage")}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB]"
            >
              ← 設定メニューへ戻る
            </button>
          ) : <div className="hidden md:block" />}
        </header>

        {tab === "manage" && (
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-2 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="border-b border-[#E5E7EB] px-8 py-6">
                <h2 className="text-xl font-semibold text-[#111827]">アカウント設定メニュー</h2>
                <p className="mt-2 text-sm text-[#6B7280]">プロフィール設定・通知設定・ログイン設定に移動できます。</p>
              </div>
                <div className="divide-y divide-[#E5E7EB]">
                <ManageListRow
                  title="プロフィール設定"
                  desc={userRole === "tutor" ? "公開プロフィール、写真、基本情報を編集します。" : "氏名や学校名などの基本情報を編集します。"}
                  onClick={() => setTabAndQuery("profile")}
                />
                {userRole === "tutor" ? (
                  <>
                    <ManageListRow title="学生証認証" desc="学生証の表裏と入学/卒業予定年度を提出します。" onClick={() => router.push("/verification/student-id")} />
                    <ManageListRow title="口座登録" desc="Stripe Connect の振込先口座を設定します。" onClick={() => router.push("/profile/payouts")} />
                  </>
                ) : null}
                <ManageListRow title="通知設定" desc="メール通知、LINE通知、通知の受け取り方を管理します。" onClick={() => setTabAndQuery("notifications")} />
                <ManageListRow title="ログイン設定" desc="メールアドレス変更、パスワード変更を管理します。" onClick={() => setTabAndQuery("login")} />
              </div>
            </div>
            <p className="mt-8 text-center text-xs text-[#6B7280]/70">© 2024 ユニブリ. All rights reserved.</p>
          </div>
        )}

        {tab === "profile" && (
          userRole !== "tutor" ? (
            <div className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-[#111827]">基本プロフィール設定</h2>
                <p className="mt-3 text-sm text-[#6B7280]">高校生アカウント向けの基本情報を更新できます。</p>

                <form className="mt-6 space-y-5" onSubmit={onSaveBasicProfile}>
                  <ProfileInput
                    label="氏名"
                    value={form.full_name}
                    onChange={(v) => setForm((p) => ({ ...p, full_name: v }))}
                    placeholder="山田 太郎"
                  />
                  <ProfileInput
                    label="学校名"
                    value={form.school}
                    onChange={(v) => setForm((p) => ({ ...p, school: v }))}
                    placeholder="〇〇高校"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loadingProfile}
                      className="rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0ea371] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingProfile ? "保存中..." : "保存する"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabAndQuery("manage")}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      設定メニューへ戻る
                    </button>
                  </div>
                </form>
                <div className="mt-4">
                  {notice ? <p className="text-sm font-medium text-[#059669]">{notice}</p> : null}
                  {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
                </div>
              </div>
            </div>
          ) : (
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="relative h-40 w-full bg-[#E0E7FF]" style={{
                backgroundImage:
                  "radial-gradient(at 10% 10%, #FEF3C7 0px, transparent 50%), radial-gradient(at 90% 10%, #D1FAE5 0px, transparent 50%), radial-gradient(at 50% 90%, #DBEAFE 0px, transparent 50%)"
              }}>
                {coverPreview ? <img src={coverPreview} alt="cover" className="h-full w-full object-cover" /> : null}
                <label className="absolute right-4 top-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30">
                  <EditIcon />
                  Edit Cover
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <form id="profile-form-container" className="px-8 pb-8" onSubmit={onSaveProfile}>
                <div className="relative -mt-12 mb-6 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-center">
                  <div className="group relative">
                    <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-md md:h-32 md:w-32">
                      {avatarPreview ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" /> : null}
                    </div>
                    <label className="absolute bottom-1 right-1 cursor-pointer rounded-full border border-[#E5E7EB] bg-white p-1.5 text-[#6B7280] shadow-sm transition group-hover:scale-110 group-hover:text-[#10B981]">
                      <CameraIcon />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>

                  <div className="flex-1 pt-2 text-center md:pt-12 md:text-left">
                    <h2 className="flex flex-wrap items-center justify-center gap-2 text-4xl font-bold leading-none text-[#111827] md:justify-start lg:text-5xl">
                      {form.full_name || "kotaro"}
                      {verification.status === "approved" ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          学生証認証済み
                        </span>
                      ) : (
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          学生証未認証
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-sm text-[#6B7280]">{form.school || "成蹊大学"}</p>
                  </div>
                  </div>

                  <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-end xl:mt-12 xl:w-auto">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#10B981] px-4 py-2 text-sm font-medium text-[#10B981] hover:bg-[#10B981]/5">
                      <ImageIcon />
                      写真を変更
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      />
                    </label>

                    <button
                      id="status-toggle"
                      type="button"
                      onClick={onTogglePublish}
                      disabled={loadingPublish}
                      className="flex items-center justify-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"
                    >
                      <span className="text-sm font-medium text-[#111827]">
                        {loadingPublish ? "更新中..." : form.is_published ? "公開中" : "非公開"}
                      </span>
                      <span className={`relative inline-block h-6 w-11 rounded-full ${form.is_published ? "bg-[#10B981]" : "bg-gray-300"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${form.is_published ? "left-[22px]" : "left-0.5"}`} />
                      </span>
                    </button>
                  </div>
                </div>

                <hr className="mb-8 border-[#E5E7EB]" />

                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">氏名</span>
                    <input
                      className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="本名を入力"
                    />
                    <p className="-mt-1 pl-1 text-xs text-[#6B7280]">※ 本名は運営のみ確認できます（一般ユーザーには表示されません）</p>
                  </label>
                  <label className="space-y-2">
                    <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">ニックネーム</span>
                    <input
                      className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                      value={form.nickname}
                      onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                      placeholder="タロー"
                    />
                    <p className="-mt-1 pl-1 text-xs text-[#6B7280]">※ 実際に他のユーザーに表示される名前です</p>
                  </label>
                  <ProfileInput label="学校名" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
                  <ProfileInput label="学部学科" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                  <ProfileInput label="ゼミ" value={form.seminar} onChange={(v) => setForm({ ...form, seminar: v })} />

                  <label className="space-y-2">
                    <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">学年</span>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                        value={form.grade}
                        onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      >
                        <option value="">選択</option>
                        <option value="1年">1年</option>
                        <option value="2年">2年</option>
                        <option value="3年">3年</option>
                        <option value="4年">4年</option>
                        <option value="修士1年">修士1年</option>
                        <option value="修士2年">修士2年</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xl text-[#6B7280]"><ChevronDownIcon /></span>
                    </div>
                  </label>

                  <label id="interest-tags" className="space-y-2 md:col-span-2">
                    <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">探究テーマ</span>
                    <textarea
                      className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                      rows={3}
                      placeholder="あなたの探究テーマについて詳しく教えてください"
                      value={form.research_theme}
                      onChange={(e) => setForm({ ...form, research_theme: e.target.value })}
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">指導経験</span>
                    <textarea
                      className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                      rows={4}
                      placeholder="例）志望理由書の添削15件、面接対策10件 など"
                      value={form.coaching_experience}
                      onChange={(e) => setForm({ ...form, coaching_experience: e.target.value })}
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">自己紹介</span>
                    <textarea
                      className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                      rows={5}
                      placeholder="高校生に向けて、あなたの強み・サポート方針を書いてください"
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    />
                  </label>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <div className="mr-auto grid gap-3">
                    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs text-[#6B7280]">
                      <p className="font-semibold text-[#111827]">学生証認証</p>
                      <p className="mt-1">
                        {verification.status === "approved"
                          ? "承認済み（プロフィール公開可能）"
                          : verification.status === "pending"
                            ? "審査中（公開は承認後）"
                            : verification.status === "rejected"
                              ? "差し戻し（再提出してください）"
                              : "未提出（公開には提出が必要）"}
                      </p>
                      {verification.admission_year && verification.graduation_year ? (
                        <p className="mt-1">入学 {verification.admission_year} / 卒業予定 {verification.graduation_year}</p>
                      ) : null}
                      {verification.reason ? <p className="mt-1 text-[#B91C1C]">理由: {verification.reason}</p> : null}
                      <Link id="student-verification-link" href="/verification/student-id" className="mt-2 inline-block font-semibold text-[#10B981] hover:underline">
                        学生証認証ページを開く
                      </Link>
                    </div>

                    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs text-[#6B7280]">
                      <p className="font-semibold text-[#111827]">振込先口座</p>
                      <p className="mt-1">口座登録・更新は専用ページから行ってください。</p>
                      <Link href="/profile/payouts" className="mt-2 inline-block font-semibold text-[#10B981] hover:underline">
                        口座登録ページを開く
                      </Link>
                    </div>
                  </div>
                  <Link href="/profile/settings?tab=manage" className="rounded-lg border border-transparent px-6 py-2.5 text-sm font-medium text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F9FAFB]">
                    キャンセル
                  </Link>
                  <button
                    id="save-profile-button"
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-[#10B981] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loadingProfile}
                  >
                    <SaveIcon />
                    {loadingProfile ? "保存中..." : "保存する"}
                  </button>
                </div>
              </form>
            </div>
            <p className="mt-8 text-center text-xs text-[#6B7280]/70">© 2024 ユニブリ. All rights reserved.</p>
          </div>
          )
        )}

        {tab === "notifications" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 pb-20 pt-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveNotificationSettings();
              }}
            >
              <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3 border-b border-[#E5E7EB] bg-gray-50/50 px-6 py-4">
                  <MailIcon />
                  <div>
                    <h2 className="text-lg font-bold">メール通知</h2>
                    <p className="text-xs text-[#6B7280]">重要な更新や活動状況をメールでお知らせします</p>
                  </div>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                  <SettingRow title="新しい相談依頼" desc="学生から新しいメンター相談の申し込みがあった時" checked={draftSettings.email_new_request} onChange={(v) => setDraftSettings({ ...draftSettings, email_new_request: v })} />
                  <SettingRow title="メッセージ受信" desc="チャットで新しいメッセージを受け取った時" checked={draftSettings.email_new_message} onChange={(v) => setDraftSettings({ ...draftSettings, email_new_message: v })} />
                  <SettingRow title="お気に入り登録通知" desc="あなたのプロフィールが学生にお気に入り登録された時" checked={draftSettings.email_favorite} onChange={(v) => setDraftSettings({ ...draftSettings, email_favorite: v })} />
                  <SettingRow title="運営からのお知らせ" desc="ユニブリ運営チームからのニュースや機能アップデート" checked={draftSettings.email_ops} onChange={(v) => setDraftSettings({ ...draftSettings, email_ops: v })} />
                </div>
              </section>

              <section className="mt-8 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3 border-b border-[#E5E7EB] bg-gray-50/50 px-6 py-4">
                  <BellIcon />
                  <div>
                    <h2 className="text-lg font-bold">LINE通知</h2>
                    <p className="text-xs text-[#6B7280]">LINE連携と通知対象を設定します</p>
                  </div>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                  <SettingRow title="LINE通知を有効化" desc="LINEへの通知送信を有効にする" checked={draftSettings.line_enabled} onChange={(v) => setDraftSettings({ ...draftSettings, line_enabled: v })} />
                  <SettingRow title="LINE: 新規依頼通知" desc="高校生から新しい依頼が届いた時" checked={draftSettings.line_new_request} onChange={(v) => setDraftSettings({ ...draftSettings, line_new_request: v })} />
                  <SettingRow title="LINE: ステータス更新通知" desc="承認・支払い・完了などの進捗更新時" checked={draftSettings.line_status_update} onChange={(v) => setDraftSettings({ ...draftSettings, line_status_update: v })} />
                </div>
                <div className="border-t border-[#E5E7EB] p-6">
                  <button
                    id="line-connect-button"
                    type="button"
                    onClick={connectLine}
                    className="rounded-lg border border-[#00B884] px-4 py-2 text-sm font-medium text-[#00B884] hover:bg-[#00B884]/5"
                    disabled={loadingLine}
                  >
                    {loadingLine ? "LINE連携中..." : "LINEを連携する"}
                  </button>
                </div>
              </section>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetNotificationSettings}
                  className="rounded-lg border border-transparent px-6 py-2.5 text-sm font-medium text-[#6B7280] hover:border-[#E5E7EB] hover:bg-white"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-[#00B884] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loadingSettings}
                >
                  <SaveIcon />
                  {loadingSettings ? "保存中..." : "変更を保存"}
                </button>
              </div>
            </form>
            <p className="text-center text-xs text-[#6B7280]/70">© 2024 ユニブリ. All rights reserved.</p>
          </div>
        )}

        {tab === "login" && (
          <div className="mx-auto max-w-4xl space-y-6 px-8 pb-20 pt-8">
            <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="border-b border-[#E5E7EB] px-6 py-5">
                <h3 className="text-base font-semibold">メールアドレス</h3>
              </div>
              <div className="grid gap-5 p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="mb-1 text-sm text-[#6B7280]">現在のメールアドレス</p>
                    <div className="flex items-center gap-2">
                      <MailIcon />
                      <span className="font-medium">{email || "ログイン中のアカウント"}</span>
                      <span className="ml-2 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">認証済み</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="mb-1 text-sm text-[#6B7280]">新しいメールアドレスへの変更</p>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[#111827]">新しいメールアドレス</span>
                    <input
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new@example.com"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={sendEmailChangeCode}
                      disabled={loadingEmailChange}
                      className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingEmailChange ? "送信中..." : "確認コードを送信"}
                    </button>
                    {emailChangePending ? (
                      <>
                        <input
                          className="w-48 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                          value={emailChangeCode}
                          onChange={(e) => setEmailChangeCode(e.target.value.replace(/\\D/g, "").slice(0, 6))}
                          inputMode="text"
                          maxLength={8}
                          placeholder="認証コード"
                        />
                        <button
                          type="button"
                          onClick={verifyEmailChangeCode}
                          disabled={loadingEmailChange}
                          className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          コード確認
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="border-b border-[#E5E7EB] px-6 py-5">
                <h3 className="text-base font-semibold">パスワード変更</h3>
                <p className="mt-1 text-xs text-[#6B7280]">定期的にパスワードを変更することを推奨します。</p>
              </div>
              <form className="space-y-5 p-6" onSubmit={onSavePassword}>
                <ProfileInput label="現在のパスワード" type="password" value={currentPassword} onChange={setCurrentPassword} />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <ProfileInput label="新しいパスワード" type="password" value={newPassword} onChange={setNewPassword} />
                  <ProfileInput label="新しいパスワード（確認）" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6B7280]">パスワード強度</span>
                    <span className={`text-xs font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                  </div>
                  <div className="flex h-1.5 w-full gap-1">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`h-full flex-1 rounded-full ${
                          idx < passwordStrength.score ? passwordStrength.barColor : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7280]">8文字以上で、大文字・小文字・数字・記号を含めると強くなります。</p>
                  {!passwordsMatch ? <p className="text-xs text-red-600">確認用パスワードが一致していません。</p> : null}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loadingPassword}
                    className="flex items-center gap-2 rounded-lg bg-[#10B981] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SaveIcon />
                    {loadingPassword ? "更新中..." : "更新する"}
                  </button>
                </div>
              </form>
            </section>

            

            <p className="mt-8 text-center text-xs text-[#6B7280]/70">© 2024 ユニブリ. All rights reserved.</p>
          </div>
        )}

        {(error || notice) && (
          <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
            {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
            {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p> : null}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}

function iconClassName(extra = "") {
  return `h-[22px] w-[22px] ${extra}`.trim();
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="11" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="18" width="7" height="3" rx="1.5" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a3 3 0 0 1 0 5.74" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 20a1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4 9a1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.39-.23.68-.6.75-1.04V3a2 2 0 1 1 4 0v.09c.07.44.36.81.75 1.04A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1-.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.39.6.68 1.04.75H21a2 2 0 1 1 0 4h-.09c-.44.07-.81.36-1.04.75z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName("h-[18px] w-[18px]")}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName("h-[18px] w-[18px]")}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName("h-[18px] w-[18px]")}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName("h-[18px] w-[18px]")}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName("h-[16px] w-[16px]")}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName("h-[16px] w-[16px]")}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName()}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ManageListRow({
  title,
  desc,
  onClick
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 px-8 py-6 text-left transition hover:bg-[#F9FAFB]"
    >
      <div>
        <p className="text-lg font-semibold text-[#111827]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#6B7280]">{desc}</p>
      </div>
      <span className="text-xl text-[#9CA3AF]">→</span>
    </button>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
  type,
  readOnly
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  readOnly?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="block pl-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[#111827] outline-none placeholder:text-gray-400 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
      />
    </label>
  );
}

function InfoRow({
  label,
  value,
  multiline
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={`grid gap-1 ${multiline ? "" : "sm:grid-cols-[92px_1fr] sm:items-start"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className={`rounded-lg bg-[#F9FAFB] px-3 py-2 text-[#111827] ${multiline ? "min-h-16 whitespace-pre-wrap" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function ManageCard({
  title,
  desc,
  actionLabel,
  onClick
}: {
  title: string;
  desc: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <p className="text-base font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#6B7280]">{desc}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex items-center rounded-lg bg-[#10B981] px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ManageShortcutCard({
  title,
  desc,
  href,
  icon
}: {
  title: string;
  desc: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="block w-full rounded-xl border border-[#E5E7EB] bg-white p-5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
        {icon}
      </div>
      <p className="text-base font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#6B7280]">{desc}</p>
    </Link>
  );
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) {
    return {
      score: 0,
      label: "未入力",
      color: "text-gray-400",
      barColor: "bg-gray-200"
    };
  }

  if (score <= 1) {
    return {
      score: 1,
      label: "弱い",
      color: "text-red-500",
      barColor: "bg-red-400"
    };
  }

  if (score === 2) {
    return {
      score: 2,
      label: "普通",
      color: "text-amber-500",
      barColor: "bg-amber-400"
    };
  }

  if (score === 3) {
    return {
      score: 3,
      label: "良い",
      color: "text-lime-600",
      barColor: "bg-lime-500"
    };
  }

  return {
    score: 4,
    label: "強い",
    color: "text-emerald-600",
    barColor: "bg-emerald-500"
  };
}

function SettingRow({
  title,
  desc,
  checked,
  onChange
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
      <div className="pr-8">
        <h3 className="font-medium text-[#111827]">{title}</h3>
        <p className="mt-1 text-sm text-[#6B7280]">{desc}</p>
      </div>
      <label className="relative inline-block h-6 w-12">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-[#00B884]" />
        <span className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition peer-checked:translate-x-6" />
      </label>
    </div>
  );
}
