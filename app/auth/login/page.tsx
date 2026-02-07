"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h2 className="text-2xl font-semibold text-sea">ログイン</h2>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="label">メール</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="label">パスワード</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="mt-4 text-sm text-sea/70">
          アカウントがない？ <Link className="text-accent" href="/auth/register">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
