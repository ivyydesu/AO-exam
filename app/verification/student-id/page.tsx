"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase/client";

const MAX_IMAGE_BYTES = 3_145_728;
const FILE_SIZE_ERROR_MESSAGE = "ファイルサイズが大きすぎます。3MB以下の画像を選択してください。";

type Verification = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  admission_year: number | null;
  graduation_year: number | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function StudentIdVerificationPage() {
  const router = useRouter();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [admissionYear, setAdmissionYear] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOverSizeLimit = (file: File | null) => Boolean(file && file.size > MAX_IMAGE_BYTES);

  const handleImageSelect = (
    file: File | null,
    setter: (value: File | null) => void
  ) => {
    if (!file) {
      setter(null);
      return;
    }
    if (isOverSizeLimit(file)) {
      setter(null);
      setError(FILE_SIZE_ERROR_MESSAGE);
      setNotice(null);
      setLoading(false);
      return;
    }
    setter(file);
    setError((prev) => (prev === FILE_SIZE_ERROR_MESSAGE ? null : prev));
  };

  const resolveApiError = async (res: Response, fallback: string) => {
    const text = await res.text().catch(() => "");
    if (!text) return fallback;
    try {
      const parsed = JSON.parse(text) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        return parsed.error;
      }
    } catch {
      // 非JSONのエラーレスポンスは本文をそのまま表示する。
    }
    return text.trim() || fallback;
  };

  const loadStatus = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabaseが初期化されていません");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("ログインが必要です");
        return;
      }
      const token = sessionData.session.access_token;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionData.session.user.id).maybeSingle();
      const isTutor = profile?.role === "tutor";
      setAllowed(isTutor);
      if (!isTutor) {
        router.replace("/profile/settings?tab=manage");
        return;
      }

      const res = await fetch("/api/verification/student-id", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setError(await resolveApiError(res, "状態取得に失敗しました"));
        return;
      }
      const payload = (await res.json().catch(() => null)) as { verification?: Verification | null } | null;
      setVerification(payload?.verification ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "状態取得に失敗しました");
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) {
      setLoading(false);
    }
    setError(null);
    setNotice(null);
    if (!frontFile || !backFile) {
      setError("学生証の表・裏画像を選択してください");
      return;
    }
    if (isOverSizeLimit(frontFile) || isOverSizeLimit(backFile)) {
      setError(FILE_SIZE_ERROR_MESSAGE);
      setLoading(false);
      return;
    }
    if (!/^\d{4}$/.test(admissionYear) || !/^\d{4}$/.test(graduationYear)) {
      setError("入学年度・卒業予定年度は4桁の西暦で入力してください");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabaseが初期化されていません");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("ログインが必要です");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("studentIdImageFront", frontFile);
      formData.append("studentIdImageBack", backFile);
      formData.append("admissionYear", admissionYear);
      formData.append("graduationYear", graduationYear);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
      let res: Response;
      try {
        res = await fetch("/api/verification/student-id", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
          },
          body: formData,
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!res.ok) {
        setError(await resolveApiError(res, "申請に失敗しました"));
        return;
      }
      setNotice("学生証を提出しました。審査完了までお待ちください。");
      await loadStatus();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("アップロードがタイムアウトしました。通信環境を確認して再実行してください。");
      } else {
        setError("アップロードに失敗しました。時間を空けて再度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card grid gap-6 p-8">
        {allowed === false ? null : null}
        <div>
          <h1 className="text-2xl font-semibold text-sea">学生証認証</h1>
          <p className="mt-2 text-sm text-sea/70">
            大学生はサービス利用前に学生証の審査が必要です。閲覧のみ可能で、審査通過後に利用できます。
          </p>
          <p className="mt-1 text-sm text-sea/70">
            審査・管理は運営の管理画面でのみ実施されます。
          </p>
        </div>

        <div className="rounded-xl border border-sand p-4 text-sm">
          <p className="font-semibold text-sea">現在の審査状態</p>
          <p className="mt-2 text-sea/70">
            {verification?.status === "approved"
              ? "承認済み"
              : verification?.status === "rejected"
                ? "差し戻し"
                : verification?.status === "pending"
                  ? "審査中"
                  : "未提出"}
          </p>
          {verification?.reason && (
            <p className="mt-2 text-accent">差し戻し理由: {verification.reason}</p>
          )}
          {verification?.admission_year && verification?.graduation_year ? (
            <p className="mt-2 text-sea/70">入学年度: {verification.admission_year} / 卒業予定年度: {verification.graduation_year}</p>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="grid gap-2">
            <span className="label">学生証画像（表）</span>
            <input
              className="input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null, setFrontFile)}
            />
          </label>
          <label className="grid gap-2">
            <span className="label">学生証画像（裏）</span>
            <input
              className="input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null, setBackFile)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="label">入学年度</span>
              <input className="input" placeholder="例: 2024" value={admissionYear} onChange={(e) => setAdmissionYear(e.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="label">卒業予定年度</span>
              <input className="input" placeholder="例: 2028" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} />
            </label>
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          {notice && <p className="text-sm text-sea">{notice}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "提出中..." : "学生証を提出する"}
          </button>
        </form>

        <Link href="/home" className="text-sm text-accent">トップへ戻る</Link>
      </div>
    </div>
  );
}
