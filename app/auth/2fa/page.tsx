"use client";

import { useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";

function TwoFactorPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const mode = search.get("mode") || "admin";
  const returnTo = search.get("returnTo") || "/admin";
  const emailParam = search.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => code.length >= 6 && email.length > 3, [code, email]);

  useEffect(() => {
    if (mode !== "admin") {
      router.replace("/auth/login");
      return;
    }
    const send = async () => {
      setSending(true);
      setError(null);
      setNotice(null);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabaseが初期化されていません");
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false }
        });
        if (otpError) throw otpError;
        setNotice("認証コードをメールに送信しました。");
      } catch (e) {
        setError(e instanceof Error ? e.message : "認証コード送信に失敗しました");
      } finally {
        setSending(false);
      }
    };
    if (email) void send();
  }, [email, mode, router]);

  const resend = async () => {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });
      if (otpError) throw otpError;
      setNotice("認証コードを再送しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "再送に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
      });
      if (verifyError || !data.user) throw new Error(verifyError?.message ?? "コードが正しくありません");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("セッション取得に失敗しました");

      const completeRes = await fetch("/api/auth/admin-2fa/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const completePayload = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) throw new Error(completePayload.error ?? "2段階認証の完了に失敗しました");

      router.replace(returnTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "認証に失敗しました");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-81px)] w-full max-w-[1280px] px-6 py-10">
      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="grid md:grid-cols-[56%_44%]">
          <section className="relative hidden min-h-[640px] overflow-hidden bg-gradient-to-br from-emerald-900 via-[#064e3b] to-emerald-800 p-12 text-white md:flex md:items-center">
            <div className="relative z-10 max-w-md">
              <div className="mb-10 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-xl font-bold text-emerald-600">A</div>
                <span className="text-2xl font-bold">ユニブリ</span>
              </div>
              <h1 className="text-4xl font-bold leading-tight">管理画面 2段階認証</h1>
              <p className="mt-4 text-emerald-100/90">メールに送信された6〜8桁コードを入力してください。</p>
            </div>
          </section>
          <section className="flex items-center justify-center bg-[#F9FAFB] p-6 md:p-10">
            <div className="w-full max-w-[440px]">
              <h2 className="text-3xl font-bold text-slate-900">2FA確認</h2>
              <p className="mt-2 text-sm text-slate-500">運営アカウントのみ必須です</p>

              <div className="mt-6 grid gap-3">
                <input
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                />
                <input
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                  placeholder="認証コード"
                  maxLength={8}
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={verify}
                    disabled={!canSubmit || verifying}
                    className="rounded-full bg-emerald-500 px-7 py-3 text-base font-bold text-white disabled:opacity-60"
                  >
                    {verifying ? "確認中..." : "認証して続行"}
                  </button>
                  <button
                    type="button"
                    onClick={resend}
                    disabled={sending || !email}
                    className="rounded-full border border-emerald-500 px-6 py-3 text-base font-bold text-emerald-600 disabled:opacity-60"
                  >
                    {sending ? "再送中..." : "コード再送"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl p-6 text-sm text-slate-500">読み込み中...</div>}>
      <TwoFactorPageContent />
    </Suspense>
  );
}
