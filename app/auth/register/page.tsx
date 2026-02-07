"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";

const roles = [
  { value: "student", label: "高校生（依頼者）" },
  { value: "tutor", label: "大学生（受注者）" },
  { value: "admin", label: "運営" }
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<typeof roles[number]["value"]>("student");
  const [school, setSchool] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error || !data.user) {
      setLoading(false);
      setError(error?.message ?? "登録に失敗しました");
      return;
    }

    const profileResponse = await fetch("/api/profile/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: data.user.id,
        full_name: fullName,
        role,
        school
      })
    });

    if (!profileResponse.ok) {
      const payload = await profileResponse.json();
      setLoading(false);
      setError(payload.error ?? "プロフィール作成に失敗しました");
      return;
    }

    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h2 className="text-2xl font-semibold text-sea">新規登録</h2>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="label">氏名</span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="label">メール</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="label">パスワード</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="label">役割</span>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              {roles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="label">高校・大学名（任意）</span>
            <input className="input" value={school} onChange={(e) => setSchool(e.target.value)} />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "登録中..." : "登録"}
          </button>
        </form>
        <p className="mt-4 text-sm text-sea/70">
          既にアカウントあり？ <Link className="text-accent" href="/auth/login">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
