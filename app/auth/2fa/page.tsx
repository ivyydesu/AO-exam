"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";
import {
  EMAIL_SEND_COOLDOWN_SECONDS,
  getCooldownRemaining,
  normalizeAuthErrorMessage,
  startCooldown
} from "../../../lib/auth/emailThrottle";

function TwoFactorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const role = searchParams.get("role") === "tutor" ? "tutor" : "student";
  const remember = searchParams.get("remember") === "1";
  const password = searchParams.get("password") ?? "";
  const incomingNotice = searchParams.get("notice");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(incomingNotice || "メールに送信された認証コードを入力してください。");
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const landingPath = useMemo(() => (role === "tutor" || role === "student" ? "/demo" : "/admin"), [role]);

  useEffect(() => {
    setResendCooldown(getCooldownRemaining("login-2fa", email));
    if (incomingNotice) setNotice(incomingNotice);
  }, [email, incomingNotice]);

  const normalizeOtp = (value: string) => {
    const half = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    return half.replace(/[^0-9A-Za-z]/g, "");
  };

  const handlePasteOtp = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const raw = event.clipboardData.getData("text");
    setCode(normalizeOtp(raw));
  };

  const ensureRole = async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabaseが初期化されていません");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("プロフィールが見つかりません");
    if (profile.role !== role) {
      await supabase.auth.signOut();
      throw new Error("学生区分が一致しません");
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      if (!email) throw new Error("メールアドレスが不足しています");

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: normalizeOtp(code),
        type: "email"
      });
      if (verifyError || !data.user) throw new Error(verifyError?.message ?? "認証コードが無効です");

      await ensureRole(data.user.id);

      if (remember) {
        localStorage.setItem("ao_match_login_saved", JSON.stringify({ email, password, role }));
      }

      router.push(landingPath);
    } catch (e) {
      setError(normalizeAuthErrorMessage(e instanceof Error ? e.message : "2要素認証に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      if (!email) throw new Error("メールアドレスが不足しています");
      if (resendCooldown > 0) throw new Error(`再送まで${resendCooldown}秒お待ちください`);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/2fa?role=${role}&email=${encodeURIComponent(email)}`
        }
      });
      if (otpError) throw new Error(otpError.message);
      startCooldown("login-2fa", email);
      setResendCooldown(EMAIL_SEND_COOLDOWN_SECONDS);
      setNotice("認証コードを再送信しました。");
    } catch (e) {
      setError(normalizeAuthErrorMessage(e instanceof Error ? e.message : "認証コード再送に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="grid md:grid-cols-[42%_58%]">
          <section className="relative isolate min-h-[260px] overflow-hidden bg-gradient-to-b from-[#0E4FA8] to-[#1C82F2] p-8 text-white">
            <div className="relative z-10 max-w-[320px] pr-10">
              <p className="text-sm opacity-90">Welcome to</p>
              <h1 className="mt-2 text-3xl font-semibold">AO Match</h1>
              <p className="mt-5 text-sm opacity-90">
                セキュリティ確認のため、{email || "登録メールアドレス"} に送信された認証コードを入力してください。
              </p>
            </div>
            <div className="pointer-events-none absolute -right-2 top-0 z-0 h-full w-12 bg-white/40 blur-[2px]" />
            <div className="pointer-events-none absolute -right-8 top-0 z-0 h-full w-8 bg-white/25 blur-[1px]" />
          </section>

          <section className="p-8">
            <h2 className="text-5xl font-bold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-3 text-base font-semibold text-slate-600">2FA (Email OTP)</p>
            <p className="mt-2 text-sm text-slate-500">メール本文をそのまま貼り付けても認識します。</p>

            <form className="mt-6 grid gap-4" onSubmit={verify}>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">認証コード</span>
                <input
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  value={code}
                  onChange={(e) => setCode(normalizeOtp(e.target.value))}
                  onPaste={handlePasteOtp}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="メールのコードを貼り付け"
                  required
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  コードが届かない場合は再送してください。迷惑メールも確認してください。
                </p>
              </div>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}

              <div className="flex gap-3">
                <button className="rounded-full bg-emerald-500 px-7 py-3 text-xl font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60" disabled={loading}>
                  {loading ? "確認中..." : "確認してログイン"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-emerald-500 px-7 py-3 text-xl font-bold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60"
                  onClick={resend}
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `再送まで${resendCooldown}s` : "コード再送"}
                </button>
              </div>

              <div className="pt-2">
                <Link href={`/auth/login?role=${role}&email=${encodeURIComponent(email)}`} className="text-sm font-semibold text-emerald-600 hover:underline">
                  ログイン画面に戻る
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl card p-6 text-sm text-sea/70">読み込み中...</div>}>
      <TwoFactorPageContent />
    </Suspense>
  );
}
