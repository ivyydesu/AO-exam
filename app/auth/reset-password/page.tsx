"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (!password || !confirmPassword) throw new Error("新しいパスワードを入力してください");
      if (password !== confirmPassword) throw new Error("新しいパスワードが一致していません");
      if (strength.score < 3) throw new Error("パスワード強度が不足しています");

      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      setNotice("パスワードを再設定しました。ログイン画面へ戻ってください。");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "パスワード再設定に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="grid md:grid-cols-[38%_62%]">
          <section className="bg-gradient-to-b from-[#0E4FA8] to-[#1C82F2] p-8 text-white">
            <p className="text-sm opacity-90">AO Match</p>
            <h1 className="mt-2 text-3xl font-semibold">Reset Password</h1>
            <p className="mt-5 text-sm opacity-90">メールの再設定リンクから、新しいパスワードを設定します。</p>
          </section>

          <section className="p-8">
            <h2 className="text-2xl font-semibold text-ink">新しいパスワード</h2>
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              <label className="grid gap-2">
                <span className="label">Password</span>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="label">Confirm Password</span>
                <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </label>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-sea/70">パスワード強度</span>
                  <span className={`text-xs font-bold ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className={`h-1.5 flex-1 rounded-full ${idx < strength.score ? strength.barColor : "bg-gray-200"}`} />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-accent">{error}</p>}
              {notice && <p className="text-sm text-sea">{notice}</p>}
              <div className="flex gap-3">
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? "更新中..." : "パスワードを更新"}
                </button>
                <Link className="btn btn-secondary" href="/auth/login">
                  ログインへ戻る
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { score: 0, label: "未入力", color: "text-gray-400", barColor: "bg-gray-200" };
  if (score <= 1) return { score: 1, label: "弱い", color: "text-red-500", barColor: "bg-red-400" };
  if (score === 2) return { score: 2, label: "普通", color: "text-amber-500", barColor: "bg-amber-400" };
  if (score === 3) return { score: 3, label: "良い", color: "text-lime-600", barColor: "bg-lime-500" };
  return { score: 4, label: "強い", color: "text-emerald-600", barColor: "bg-emerald-500" };
}
