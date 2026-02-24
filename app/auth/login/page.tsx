"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";
import AuthDevTools from "../../../components/AuthDevTools";

const roles = [
  { value: "student", label: "高校生" },
  { value: "tutor", label: "大学生" }
] as const;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const emailParam = searchParams.get("email") ?? "";
  const initialRole = useMemo(
    () => (roleParam === "tutor" ? "tutor" : roleParam === "student" ? "student" : "student"),
    [roleParam]
  );

  const [role, setRole] = useState<"student" | "tutor">(initialRole);
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [otpSent, setOtpSent] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const getLandingPath = (currentRole: "student" | "tutor") => {
    if (currentRole === "tutor") return "/demo";
    return "/dashboard";
  };

  const normalizeOtp = (value: string) => {
    const half = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    return half.replace(/[^0-9A-Za-z]/g, "");
  };

  const handlePasteOtp = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const raw = event.clipboardData.getData("text");
    setOtpCode(normalizeOtp(raw));
  };

  useEffect(() => {
    const registered = searchParams.get("registered");
    const verified = searchParams.get("verified");
    if (registered === "1") setNotice("登録完了。メール認証後にログインしてください。");
    if (verified === "1") setNotice("メール認証が完了しました。ログインできます。");
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem("ao_match_login_saved");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { email?: string; password?: string; role?: "student" | "tutor" };
      if (parsed.email) setEmail(parsed.email);
      if (parsed.password) setPassword(parsed.password);
      if (parsed.role) setRole(parsed.role);
      setRemember(true);
    } catch {
      // ignore parse error
    }
  }, []);

  const ensureRole = async (
    userId: string,
    userEmail?: string | null,
    registeredRole?: unknown
  ) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabaseが初期化されていません");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const normalizedRegisteredRole =
      registeredRole === "student" || registeredRole === "tutor"
        ? (registeredRole as "student" | "tutor")
        : null;

    if (!profile) {
      const createRole = normalizedRegisteredRole ?? role;
      if (createRole !== role) {
        await supabase.auth.signOut();
        throw new Error("学生区分が一致しません（登録時の区分でログインしてください）");
      }
      const fallbackName = (userEmail?.split("@")[0] ?? "AO Match User").slice(0, 40);
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fallbackName,
        role: createRole,
        school: null
      });
      if (insertError) throw new Error(`プロフィール初期化に失敗しました: ${insertError.message}`);
      return;
    }

    if (profile.role !== role) {
      await supabase.auth.signOut();
      throw new Error("学生区分が一致しません（高校生/大学生を確認してください）");
    }
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
      await ensureRole(data.user.id, data.user.email, data.user.user_metadata?.role);
      if (remember) {
        localStorage.setItem(
          "ao_match_login_saved",
          JSON.stringify({ email, password, role })
        );
      } else {
        localStorage.removeItem("ao_match_login_saved");
      }
      router.push(getLandingPath(role));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch";
      if (message.includes("Failed to fetch")) {
        setError("Failed to fetch: 開発サーバー停止かAPIエラーです。診断APIを実行してください。");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/login?role=${role}&verified=1`
        }
      });
      if (otpError) throw new Error(otpError.message);
      setOtpSent(true);
      setNotice("認証コードをメール送信しました。");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch";
      if (message.includes("Failed to fetch")) {
        setError("Failed to fetch: 開発サーバー停止かAPIエラーです。診断APIを実行してください。");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: normalizeOtp(otpCode),
        type: "email"
      });
      if (verifyError || !data.user) throw new Error(verifyError?.message ?? "認証コードが無効です");
      await ensureRole(data.user.id, data.user.email, data.user.user_metadata?.role);
      if (remember) {
        localStorage.setItem(
          "ao_match_login_saved",
          JSON.stringify({ email, password, role })
        );
      } else {
        localStorage.removeItem("ao_match_login_saved");
      }
      router.push(getLandingPath(role));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch";
      if (message.includes("Failed to fetch")) {
        setError("Failed to fetch: 開発サーバー停止かAPIエラーです。診断APIを実行してください。");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="grid md:grid-cols-[42%_58%]">
          <section className="relative isolate min-h-[260px] overflow-hidden bg-gradient-to-b from-[#0E4FA8] to-[#1C82F2] p-8 text-white">
            <div className="relative z-10">
              <p className="text-sm opacity-90">Welcome to</p>
              <h1 className="mt-2 text-3xl font-semibold">AO Match</h1>
              <p className="mt-5 text-sm opacity-90">
              高校生と大学生のAO入試マッチング。ログインして利用を開始します。
              </p>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 z-0 h-full w-16 bg-white/55 blur-[2px]" />
            <div className="pointer-events-none absolute -right-5 top-0 z-0 h-full w-12 bg-white/35 blur-[1px]" />
          </section>

          <section className="p-8">
            <h2 className="text-2xl font-semibold text-ink">Sign in</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="label">学生区分</span>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as "student" | "tutor")}>
                  {roles.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button type="button" className={`btn ${mode === "password" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("password")}>
                  Password
                </button>
                <button type="button" className={`btn ${mode === "otp" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("otp")}>
                  2FA (Email OTP)
                </button>
              </div>
            </div>

            {mode === "password" && (
              <form className="mt-5 grid gap-4" onSubmit={signInPassword}>
                <label className="grid gap-2">
                  <span className="label">E-mail Address</span>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label className="grid gap-2">
                  <span className="label">Password</span>
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
                <label className="flex items-center gap-2 text-sm text-sea/80">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  メールアドレス/パスワードを保存する
                </label>
                {error && <p className="text-sm text-accent">{error}</p>}
                {notice && <p className="text-sm text-sea">{notice}</p>}
                <div className="flex gap-3">
                  <button className="btn btn-primary" disabled={loading}>
                    {loading ? "処理中..." : "Sign In"}
                  </button>
                  <Link className="btn btn-secondary" href={`/auth/register?role=${role}`}>
                    Sign Up
                  </Link>
                </div>
              </form>
            )}

            {mode === "otp" && (
              <form className="mt-5 grid gap-4" onSubmit={verifyOtp}>
                <label className="grid gap-2">
                  <span className="label">E-mail Address</span>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <div className="flex items-center gap-3">
                  <button className="btn btn-secondary" type="button" onClick={sendOtp} disabled={loading}>
                    認証コード送信
                  </button>
                  {otpSent && <span className="text-xs text-sea/70">送信済み</span>}
                </div>
                <label className="grid gap-2">
                  <span className="label">OTPコード</span>
                  <input
                    className="input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(normalizeOtp(e.target.value))}
                    onPaste={handlePasteOtp}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="メールのコードを貼り付け"
                    required
                  />
                </label>
                <p className="text-xs text-sea/70">
                  メール本文をそのまま貼り付けできます（数字/英数字を自動抽出）。
                </p>
                {error && <p className="text-sm text-accent">{error}</p>}
                {notice && <p className="text-sm text-sea">{notice}</p>}
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? "処理中..." : "認証してログイン"}
                </button>
              </form>
            )}
            <AuthDevTools />
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
