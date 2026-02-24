"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type TestResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export default function DevDebugPage() {
  const [output, setOutput] = useState("結果はここに表示されます");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [appMode, setAppMode] = useState<"test" | "production">("production");

  useEffect(() => {
    loadMode().catch(() => {
      // ignore
    });
  }, []);

  const loadMode = async () => {
    const res = await fetch("/api/dev/mode");
    const data = await res.json();
    setAppMode(data.mode === "test" ? "test" : "production");
  };

  const switchAppMode = async (mode: "test" | "production") => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "モード切替に失敗しました");
      setAppMode(data.mode);
      setOutput(`アプリモードを ${data.mode} に切り替えました`);
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "モード切替に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/diagnostics");
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const testSession = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      let role: string | null = null;
      if (data.session?.user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        role = profile?.role ?? null;
      }
      setOutput(
        JSON.stringify(
          { hasSession: Boolean(data.session), userId: data.session?.user.id ?? null, role },
          null,
          2
        )
      );
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const runRequestFlowSmoke = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/request-flow-smoke");
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const runCreateDryRun = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const requesterId = sessionData.session?.user.id;
      if (!requesterId) throw new Error("ログインしてください");

      const { data: tutors, error: tutorError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "tutor")
        .neq("id", requesterId)
        .limit(1);
      if (tutorError) throw tutorError;
      const tutorId = tutors?.[0]?.id;
      if (!tutorId) throw new Error("テスト用の大学生ユーザーが見つかりません");

      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: true,
          requesterId,
          tutorId,
          supportTopic: "essay_review",
          supportMethod: "online_mtg",
          estimatedDuration: "60m",
          requestedDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          requestedPrice: 12000
        })
      });
      const data = await res.json();
      setOutput(JSON.stringify({ status: res.status, ...data }, null, 2));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const runFullSuite = async () => {
    setLoading(true);
    const suite: TestResult[] = [];
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not initialized");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData.session?.user.id ?? null;
      suite.push({
        name: "1) ログインセッション",
        ok: Boolean(userId),
        detail: userId ? `ok: ${userId}` : "ng: 未ログイン"
      });

      let role: string | null = null;
      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        role = profile?.role ?? null;
        suite.push({
          name: "2) profilesロール取得",
          ok: !profileError && Boolean(role),
          detail: profileError ? `ng: ${profileError.message}` : `ok: role=${role ?? "null"}`
        });
      } else {
        suite.push({
          name: "2) profilesロール取得",
          ok: false,
          detail: "skip: 未ログイン"
        });
      }

      const diagRes = await fetch("/api/dev/diagnostics");
      const diagData = await diagRes.json();
      suite.push({
        name: "3) 環境/接続診断API",
        ok: diagRes.ok,
        detail: diagRes.ok ? "ok" : `ng: status=${diagRes.status}`
      });

      const smokeRes = await fetch("/api/dev/request-flow-smoke");
      const smokeData = await smokeRes.json();
      suite.push({
        name: "4) 申請フロー診断API",
        ok: smokeRes.ok && Boolean(smokeData?.checks),
        detail: smokeRes.ok ? "ok" : `ng: status=${smokeRes.status}`
      });

      if (userId && role === "student") {
        const { data: tutors } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "tutor")
          .neq("id", userId)
          .limit(1);
        const tutorId = tutors?.[0]?.id;

        if (tutorId) {
          const createDry = await fetch("/api/requests/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dryRun: true,
              requesterId: userId,
              tutorId,
              supportTopic: "theme_consult",
              supportMethod: "text",
              estimatedDuration: "30m",
              requestedDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              requestedPrice: 7000
            })
          });
          const createDryData = await createDry.json();
          suite.push({
            name: "5) 依頼作成DryRun",
            ok: createDry.ok && createDryData?.dryRun === true,
            detail: createDry.ok ? "ok" : `ng: ${createDryData?.error ?? createDry.status}`
          });
        } else {
          suite.push({
            name: "5) 依頼作成DryRun",
            ok: false,
            detail: "ng: tutorユーザーが見つからない"
          });
        }
      } else {
        suite.push({
          name: "5) 依頼作成DryRun",
          ok: true,
          detail: `skip: role=${role ?? "none"}`
        });
      }

      setOutput(JSON.stringify({ diagnostics: diagData, requestFlow: smokeData, suite }, null, 2));
    } catch (error) {
      suite.push({
        name: "Suite実行",
        ok: false,
        detail: error instanceof Error ? error.message : "unknown error"
      });
      setOutput(error instanceof Error ? error.message : "Failed to fetch");
    } finally {
      setResults(suite);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl grid gap-6">
      <header className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">デバッグ画面</h1>
        <p className="text-sm text-sea/70 mt-2">ワンクリックで主要機能の疎通確認ができます。</p>
      </header>

      <section className="card p-6">
        <div className="mb-4 rounded-xl border border-sand bg-cloud p-3">
          <p className="text-sm text-sea/80">現在モード: {appMode}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-secondary" type="button" onClick={() => switchAppMode("test")} disabled={loading}>
              テストモード
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => switchAppMode("production")} disabled={loading}>
              製品版モード
            </button>
            <button className="btn btn-secondary" type="button" onClick={loadMode} disabled={loading}>
              モード再取得
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={runFullSuite} disabled={loading}>
            総合テスト実行（推奨）
          </button>
          <button className="btn btn-secondary" type="button" onClick={runDiagnostics} disabled={loading}>
            診断API実行
          </button>
          <button className="btn btn-secondary" type="button" onClick={testSession} disabled={loading}>
            セッション確認
          </button>
          <button className="btn btn-secondary" type="button" onClick={runRequestFlowSmoke} disabled={loading}>
            申請フロー診断
          </button>
          <button className="btn btn-secondary" type="button" onClick={runCreateDryRun} disabled={loading}>
            依頼作成Dry Run
          </button>
          <Link className="btn btn-secondary" href="/verification/student-id">学生認証ページ</Link>
          <Link className="btn btn-secondary" href="/admin/verifications">運営管理画面</Link>
          <Link className="btn btn-secondary" href="/tutor/requests">大学生画面</Link>
          <Link className="btn btn-secondary" href="/demo">高校生画面</Link>
          <Link className="btn btn-secondary" href="/student/status">高校生進捗</Link>
          <Link className="btn btn-secondary" href="/demo/request">大学生取引管理</Link>
          <Link className="btn btn-secondary" href="/dashboard">ダッシュボード</Link>
        </div>

        {results.length > 0 && (
          <div className="mt-4 grid gap-2">
            {results.map((r) => (
              <div key={r.name} className="rounded-xl border border-sand p-3 text-sm">
                <p className={r.ok ? "text-emerald-700" : "text-accent"}>{r.ok ? "PASS" : "FAIL"} - {r.name}</p>
                <p className="text-sea/75">{r.detail}</p>
              </div>
            ))}
          </div>
        )}

        <pre className="mt-4 rounded-xl bg-cloud p-4 text-xs text-sea/80 overflow-auto">{output}</pre>
      </section>
    </div>
  );
}
