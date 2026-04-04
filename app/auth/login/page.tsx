"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { isAllowedAdminEmail } from "../../../lib/auth/adminAllowlist";
import { getPublicAppUrl } from "../../../lib/auth/appUrl";
import {
  EMAIL_SEND_COOLDOWN_SECONDS,
  getCooldownRemaining,
  normalizeAuthErrorMessage,
  startCooldown
} from "../../../lib/auth/emailThrottle";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const [roleHint, setRoleHint] = useState<"student" | "tutor">("student");
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetCooldown, setResetCooldown] = useState(0);

  const getLandingPath = (currentRole: "student" | "tutor" | "admin") => {
    if (currentRole === "student" || currentRole === "tutor") return "/home";
    if (currentRole === "admin") return `/auth/2fa?mode=admin&email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent("/admin")}`;
    return "/home";
  };

  useEffect(() => {
    const registered = searchParams.get("registered");
    const verified = searchParams.get("verified");
    const autoLoggedOut = searchParams.get("autoLoggedOut");
    if (registered === "1") setNotice("登録完了。メール認証後にログインしてください。");
    if (verified === "1") setNotice("メール認証が完了しました。ログインできます。");
    if (autoLoggedOut === "1") setNotice("30分以上操作がなかったため、安全のため自動ログアウトしました。");
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem("ao_match_login_saved");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { email?: string; password?: string };
      if (parsed.email) setEmail(parsed.email);
      if (parsed.password) setPassword(parsed.password);
      setRemember(true);
    } catch {
      // ignore parse error
    }
  }, []);

  useEffect(() => {
    setResetCooldown(getCooldownRemaining("reset-password", email));
  }, [email]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setResetCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const ensureRole = async (
    userId: string,
    userEmail?: string | null,
    registeredRole?: unknown
  ): Promise<"student" | "tutor" | "admin"> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabaseが初期化されていません");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const normalizedRegisteredRole =
      registeredRole === "student" || registeredRole === "tutor" || registeredRole === "admin"
        ? (registeredRole as "student" | "tutor" | "admin")
        : null;

    if (!profile) {
      const createRole =
        normalizedRegisteredRole === "admin" && !isAllowedAdminEmail(userEmail)
          ? roleHint
          : (normalizedRegisteredRole ?? roleHint);
      const fallbackName = (userEmail?.split("@")[0] ?? "ユニブリ User").slice(0, 40);
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fallbackName,
        role: createRole,
        school: null
      });
      if (insertError) throw new Error(`プロフィール初期化に失敗しました: ${insertError.message}`);
      return createRole;
    }
    if (profile.role === "admin" && !isAllowedAdminEmail(userEmail)) {
      return "student";
    }
    return (profile.role as "student" | "tutor" | "admin") ?? "student";
  };

  const signInPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (signInError || !data.user) throw new Error(signInError?.message ?? "ログインに失敗しました");
      if (!data.user.email_confirmed_at) {
        throw new Error("メール認証が未完了です。先にメール内リンクを開いてください。");
      }
      const resolvedRole = await ensureRole(data.user.id, data.user.email, data.user.user_metadata?.role);
      setRoleHint(resolvedRole === "admin" ? "student" : resolvedRole);

      if (resolvedRole !== "admin") {
        await fetch("/api/auth/admin-2fa/clear", { method: "POST" }).catch(() => undefined);
      }

      if (remember) {
        localStorage.setItem(
          "ao_match_login_saved",
          JSON.stringify({ email, password })
        );
      } else {
        localStorage.removeItem("ao_match_login_saved");
      }
      router.push(getLandingPath(resolvedRole));
    } catch (e) {
      const message = normalizeAuthErrorMessage(e instanceof Error ? e.message : "Failed to fetch");
      if (message.includes("Failed to fetch")) {
        setError("Failed to fetch: 開発サーバー停止かAPIエラーです。診断APIを実行してください。");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      if (!email) throw new Error("メールアドレスを入力してください");
      if (resetCooldown > 0) throw new Error(`再送まで${resetCooldown}秒お待ちください`);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getPublicAppUrl()}/auth/reset-password`
      });
      if (resetError) throw new Error(resetError.message);
      startCooldown("reset-password", email);
      setResetCooldown(EMAIL_SEND_COOLDOWN_SECONDS);
      setNotice("パスワード再設定メールを送信しました。");
    } catch (e) {
      const message = normalizeAuthErrorMessage(e instanceof Error ? e.message : "Failed to fetch");
      setError(message.includes("Failed to fetch") ? "Failed to fetch: 開発サーバー停止かAPIエラーです。診断APIを実行してください。" : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-81px)] w-full max-w-[1280px] px-6 py-10">
      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="grid md:grid-cols-[56%_44%]">
          <section className="relative hidden min-h-[640px] overflow-hidden bg-gradient-to-br from-emerald-900 via-[#064e3b] to-emerald-800 p-12 text-white md:flex md:items-center">
            <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-emerald-400/20 blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-300/15 blur-[120px]" />
            <div className="relative z-10 max-w-md">
              <div className="mb-10 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-xl font-bold text-emerald-600">A</div>
                <span className="text-2xl font-bold">ユニブリ</span>
              </div>
              <h1 className="text-5xl font-bold leading-tight">
                憧れの先輩と、<br />
                <span className="text-emerald-300">AO入試のその先へ。</span>
              </h1>
              <p className="mt-6 text-lg text-emerald-100/90">合格者のリアルな経験が、あなたの武器になる。</p>
            </div>
          </section>

          <section className="flex items-center justify-center bg-[#F9FAFB] p-6 md:p-10">
            <div className="w-full max-w-[440px]">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-slate-900">サインイン</h2>
                <p className="mt-2 text-sm text-slate-500">アカウントにログインしてください</p>
              </div>

              <form className="mt-6 grid gap-4" onSubmit={signInPassword}>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">E-mail Address</span>
                    <input className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Password</span>
                    <input className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    メールアドレス/パスワードを保存する
                  </label>
                  {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                  {notice && <p className="text-sm font-medium text-emerald-600">{notice}</p>}
                  <div className="flex gap-3">
                    <button className="rounded-full bg-emerald-500 px-7 py-3 text-xl font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60" disabled={loading}>
                      {loading ? "処理中..." : "Sign In"}
                    </button>
                    <Link className="rounded-full border border-emerald-500 px-7 py-3 text-xl font-bold text-emerald-600 transition hover:bg-emerald-50" href="/auth/register">
                      Sign Up
                    </Link>
                  </div>
                  <button type="button" className="w-fit text-sm font-semibold text-emerald-600 hover:underline disabled:opacity-50" onClick={sendResetEmail} disabled={loading || resetCooldown > 0}>
                    {resetCooldown > 0 ? `再送まで${resetCooldown}s` : "パスワードを忘れた場合"}
                  </button>
                </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl card p-6 text-sm text-sea/70">読み込み中...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
