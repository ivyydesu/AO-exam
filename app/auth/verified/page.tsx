"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type VerifyState = "loading" | "success" | "error";

export default function VerifiedPage() {
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("認証結果を確認しています...");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const error = query.get("error") || hashParams.get("error");
    const errorCode = query.get("error_code") || hashParams.get("error_code");
    const errorDescription = query.get("error_description") || hashParams.get("error_description");

    if (error) {
      const code = errorCode;
      const description = decodeURIComponent(
        errorDescription || ""
      );
      setState("error");
      if (code === "otp_expired") {
        setMessage("認証リンクの期限が切れています。新しい確認メールを再送してください。");
      } else if (description) {
        setMessage(`メール認証に失敗しました: ${description}`);
      } else {
        setMessage("メール認証に失敗しました。再度お試しください。");
      }
      return;
    }

    setState("success");
    setMessage("メール認証が済みました。ログインしてください。");
  }, []);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-3xl items-center px-6 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">メール認証</h1>
        <p
          className={`mt-4 text-base ${
            state === "error" ? "text-red-600" : state === "success" ? "text-emerald-600" : "text-slate-600"
          }`}
        >
          {message}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth/login?verified=1"
            className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-600"
          >
            ログイン画面へ
          </Link>
          {state === "error" && (
            <Link
              href="/auth/register"
              className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              新規登録へ戻る
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
