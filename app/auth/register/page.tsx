"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";
import AuthDevTools from "../../../components/AuthDevTools";

const roles = [
  { value: "student", label: "高校生" },
  { value: "tutor", label: "大学生" }
] as const;

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole = useMemo(
    () => (roleParam === "tutor" ? "tutor" : roleParam === "student" ? "student" : "student"),
    [roleParam]
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "tutor">(initialRole);
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabaseが初期化されていません");

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            school
          },
          emailRedirectTo: `${window.location.origin}/auth/login?verified=1`
        }
      });
      if (signUpError || !data.user) {
        throw new Error(signUpError?.message ?? "登録に失敗しました");
      }

      setNotice("登録完了。メール認証リンクを送信しました。");
      router.push(
        `/auth/login?role=${role}&email=${encodeURIComponent(email)}&registered=1`
      );
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
              AO入試の先輩マッチング。高校生と大学生をつなぐアカウントを作成します。
              </p>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 z-0 h-full w-16 bg-white/55 blur-[2px]" />
            <div className="pointer-events-none absolute -right-5 top-0 z-0 h-full w-12 bg-white/35 blur-[1px]" />
          </section>

          <section className="p-8">
            <h2 className="text-2xl font-semibold text-ink">Create your account</h2>
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              <label className="grid gap-2">
                <span className="label">Name</span>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="label">E-mail Address</span>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="label">Password</span>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="label">学生区分</span>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as "student" | "tutor")}>
                  {roles.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">学校名（任意）</span>
                <input className="input" value={school} onChange={(e) => setSchool(e.target.value)} />
              </label>
              <p className="text-xs text-sea/70">登録後、メール認証リンクを送信します。</p>
              {error && <p className="text-sm text-accent">{error}</p>}
              {notice && <p className="text-sm text-sea">{notice}</p>}
              <div className="flex gap-3">
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? "登録中..." : "Sign Up"}
                </button>
                <Link className="btn btn-secondary" href={`/auth/login?role=${role}`}>
                  Sign In
                </Link>
              </div>
            </form>
            <AuthDevTools />
          </section>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl card p-6 text-sm text-sea/70">読み込み中...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
