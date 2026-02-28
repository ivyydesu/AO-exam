"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type UserItem = {
  id: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
  school: string | null;
  created_at: string;
  is_suspended: boolean;
  suspended_until: string | null;
  suspended_reason: string | null;
  verification_status: "pending" | "approved" | "rejected" | null;
  verification_reviewed_at: string | null;
};

const roleLabel: Record<UserItem["role"], string> = {
  student: "高校生",
  tutor: "大学生",
  admin: "運営"
};

function chipClass(role: UserItem["role"]) {
  if (role === "admin") return "bg-[#FEF3C7] text-[#92400E]";
  if (role === "tutor") return "bg-[#E0F2FE] text-[#075985]";
  return "bg-[#ECFDF5] text-[#047857]";
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [selectedRole, setSelectedRole] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async (role = selectedRole, q = keyword) => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const params = new URLSearchParams();
      if (role !== "all") params.set("role", role);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/admin/users/list${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "ユーザー一覧の取得に失敗しました");

      setItems(payload.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ユーザー一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("all", "");
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => Number(a.is_suspended) - Number(b.is_suspended));
  }, [items]);

  const updateSuspension = async (user: UserItem, suspended: boolean) => {
    setPendingId(user.id);
    setError("");
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      let suspendedUntil: string | null = null;
      let reason: string | null = null;

      if (suspended) {
        reason = window.prompt("停止理由を入力してください", "利用規約違反の疑い") ?? "";
        const hoursText = window.prompt("停止時間（時間）を入力。空欄なら無期限", "72") ?? "";
        if (hoursText.trim()) {
          const hours = Number(hoursText);
          if (Number.isFinite(hours) && hours > 0) {
            suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
          }
        }
      }

      const res = await fetch("/api/admin/users/suspend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          suspended,
          suspendedUntil,
          reason
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "アカウント状態の更新に失敗しました");

      await load(selectedRole, keyword);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アカウント状態の更新に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">運営: ユーザー管理</h1>
            <p className="mt-2 text-sm text-[#6B7280]">本人確認状況、アカウント停止、通報対応の前提確認を管理します。</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                void load(e.target.value, keyword);
              }}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm"
            >
              <option value="all">全ロール</option>
              <option value="student">高校生</option>
              <option value="tutor">大学生</option>
              <option value="admin">運営</option>
            </select>
            <input
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm"
              placeholder="名前 / 学校名 / user id"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(selectedRole, keyword);
              }}
            />
            <button
              type="button"
              onClick={() => void load(selectedRole, keyword)}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              検索
            </button>
            <Link href="/admin" className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]">
              管理トップへ
            </Link>
          </div>
        </div>
      </header>

      {error ? <p className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr_1.3fr] border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 text-xs font-semibold tracking-wide text-[#6B7280]">
          <div>ユーザー</div>
          <div>ロール</div>
          <div>本人確認</div>
          <div>状態</div>
          <div className="text-right">操作</div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-[#6B7280]">読み込み中...</div>
        ) : sorted.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[#6B7280]">該当ユーザーはありません。</div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {sorted.map((item) => {
              const activeSuspend =
                item.is_suspended && (!item.suspended_until || new Date(item.suspended_until).getTime() > Date.now());

              return (
                <div key={item.id} className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr_1.3fr] items-center gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{item.full_name}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">{item.school ?? "学校未設定"}</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">{item.id}</p>
                  </div>

                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chipClass(item.role)}`}>{roleLabel[item.role]}</span>
                  </div>

                  <div className="text-sm text-[#374151]">
                    {item.role === "tutor" ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.verification_status === "approved"
                          ? "bg-[#ECFDF5] text-[#047857]"
                          : item.verification_status === "pending"
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : item.verification_status === "rejected"
                              ? "bg-[#FEE2E2] text-[#B91C1C]"
                              : "bg-[#F3F4F6] text-[#4B5563]"
                      }`}>
                        {item.verification_status === "approved"
                          ? "承認済み"
                          : item.verification_status === "pending"
                            ? "審査中"
                            : item.verification_status === "rejected"
                              ? "差し戻し"
                              : "未提出"}
                      </span>
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">対象外</span>
                    )}
                  </div>

                  <div>
                    {activeSuspend ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-[#B91C1C]">停止中</p>
                        <p className="text-xs text-[#6B7280]">
                          {item.suspended_until ? new Date(item.suspended_until).toLocaleString("ja-JP") : "無期限"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-[#047857]">稼働中</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    {activeSuspend ? (
                      <button
                        type="button"
                        disabled={pendingId === item.id}
                        onClick={() => void updateSuspension(item, false)}
                        className="rounded-lg border border-[#10B981] px-3 py-2 text-xs font-semibold text-[#10B981] hover:bg-[#ECFDF5] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        停止解除
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pendingId === item.id || item.role === "admin"}
                        onClick={() => void updateSuspension(item, true)}
                        className="rounded-lg border border-[#EF4444] px-3 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        停止する
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
