"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase/client";

type ReportItem = {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_role: string;
  target_user_id: string | null;
  target_name: string | null;
  target_role: string | null;
  request_id: string | null;
  report_type: string;
  category: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_note: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const statusOptions = ["open", "reviewing", "resolved", "dismissed"] as const;

function statusChip(status: ReportItem["status"]) {
  if (status === "resolved") return "bg-[#ECFDF5] text-[#047857]";
  if (status === "reviewing") return "bg-[#EFF6FF] text-[#1D4ED8]";
  if (status === "dismissed") return "bg-[#F3F4F6] text-[#4B5563]";
  return "bg-[#FEF2F2] text-[#B91C1C]";
}

export default function AdminReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (status = selectedStatus, type = selectedType) => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (type !== "all") params.set("reportType", type);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/admin/reports/list${query}`, {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "通報一覧の取得に失敗しました");
      setItems(payload.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "通報一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const reportType = params.get("reportType");
    const nextStatus = status && ["open", "reviewing", "resolved", "dismissed"].includes(status) ? status : "all";
    const nextType = reportType && ["user", "request", "message", "call", "other"].includes(reportType) ? reportType : "all";
    setSelectedStatus(nextStatus);
    setSelectedType(nextType);
    void load(nextStatus, nextType);
  }, []);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id);
      setAdminNote(selected.admin_note ?? "");
    }
  }, [selected?.id]);

  const review = async (nextStatus: ReportItem["status"]) => {
    if (!selected) return;
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("ログインが必要です");

      const res = await fetch("/api/admin/reports/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          reportId: selected.id,
          status: nextStatus,
          adminNote
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "更新に失敗しました");
      await load(selectedStatus, selectedType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8">
      <header className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">運営: 通報管理</h1>
            <p className="mt-2 text-sm text-[#6B7280]">ユーザー・取引・通話に関する通報を確認し、対応ステータスを管理します。</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                void load(e.target.value, selectedType);
              }}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm"
            >
              <option value="all">すべて</option>
              <option value="open">未対応</option>
              <option value="reviewing">確認中</option>
              <option value="resolved">解決済み</option>
              <option value="dismissed">却下</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                void load(selectedStatus, e.target.value);
              }}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm"
            >
              <option value="all">すべての種別</option>
              <option value="message">メッセージ審査</option>
              <option value="user">ユーザー</option>
              <option value="request">依頼</option>
              <option value="call">通話</option>
              <option value="other">その他</option>
            </select>
            <Link href="/admin" className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]">
              管理トップへ
            </Link>
          </div>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] px-5 py-4 text-sm font-semibold text-[#111827]">通報一覧</div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {loading ? <p className="px-2 py-3 text-sm text-[#6B7280]">読み込み中...</p> : null}
            {!loading && items.length === 0 ? <p className="px-2 py-3 text-sm text-[#6B7280]">通報はありません。</p> : null}
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border px-4 py-4 text-left transition ${selected?.id === item.id ? "border-[#10B981] bg-[#ECFDF5]" : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(item.status)}`}>{item.status}</span>
                    <span className="text-xs text-[#6B7280]">{new Date(item.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#111827]">{item.category}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{item.reporter_name} → {item.target_name ?? "対象なし"}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[#374151]">{item.details}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          {selected ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusChip(selected.status)}`}>{selected.status}</span>
                <span className="text-sm text-[#6B7280]">作成: {new Date(selected.created_at).toLocaleString("ja-JP")}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Info title="通報種別" value={selected.report_type} />
                <Info title="カテゴリ" value={selected.category} />
                <Info title="通報者" value={`${selected.reporter_name}（${selected.reporter_role}）`} />
                <Info title="対象" value={selected.target_name ? `${selected.target_name}（${selected.target_role}）` : "対象なし"} />
                <Info title="関連依頼" value={selected.request_id ?? "なし"} />
                <Info title="最終対応者" value={selected.reviewed_by_name ?? "未対応"} />
              </div>

              <section>
                <h2 className="text-lg font-semibold text-[#111827]">通報内容</h2>
                <div className="mt-3 rounded-2xl bg-[#F9FAFB] p-4 text-sm leading-7 text-[#374151] whitespace-pre-wrap">
                  {selected.details}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[#111827]">運営メモ</h2>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={7}
                  className="mt-3 w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-[#10B981]"
                  placeholder="対応方針、調査結果、ユーザーへの連絡内容などを記録します。"
                />
              </section>

              <div className="flex flex-wrap gap-3">
                {statusOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => review(item)}
                    className="rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                  >
                    {item === "open" ? "未対応へ戻す" : item === "reviewing" ? "確認中にする" : item === "resolved" ? "解決済みにする" : "却下する"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">通報を選択してください。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F9FAFB] p-4">
      <p className="text-xs font-semibold tracking-wide text-[#6B7280]">{title}</p>
      <p className="mt-2 text-sm font-medium text-[#111827]">{value}</p>
    </div>
  );
}
