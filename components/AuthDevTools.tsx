"use client";

import { useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

export default function AuthDevTools() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/diagnostics");
      const payload = await res.json();
      setResult(JSON.stringify(payload, null, 2));
    } catch (e) {
      setResult(`diagnostics failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseClient = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("client not initialized");
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setResult(
        JSON.stringify(
          { ok: true, hasSession: Boolean(data.session), userId: data.session?.user.id ?? null },
          null,
          2
        )
      );
    } catch (e) {
      setResult(`client test failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <details className="mt-6 rounded-xl border border-sand bg-[#F8FBFF] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-sea">開発者専用</summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" onClick={runDiagnostics} disabled={loading}>
          診断API実行
        </button>
        <button type="button" className="btn btn-secondary" onClick={testSupabaseClient} disabled={loading}>
          Supabase接続テスト
        </button>
        <a className="btn btn-secondary" href="/auth/role">役割選択へ</a>
        <a className="btn btn-secondary" href="/settings">設定へ</a>
      </div>
      <pre className="mt-3 max-h-52 overflow-auto rounded-lg bg-white p-3 text-xs text-sea/80">{result || "結果はここに表示"}</pre>
    </details>
  );
}
