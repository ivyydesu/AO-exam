"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type CalendarItem = {
  id: string;
  title: string;
  status: string;
  date: string;
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "依頼作成",
    pending: "依頼確認中",
    accepted: "支払い待ち",
    payment_pending: "支払い待ち",
    escrowed: "支払い完了",
    in_progress: "相談実施中",
    review_pending: "評価待ち",
    completed: "完了",
    rejected: "却下",
    cancelled: "キャンセル"
  };
  return map[status] ?? status;
}

function ToolLink({ href, label, icon, active = false }: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center rounded-lg p-3 transition-colors ${active ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#10B981]"}`}>
      <span className="text-[22px]">{icon}</span>
      <span className="ml-3 hidden lg:block">{label}</span>
    </Link>
  );
}

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRequestId, setSelectedRequestId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedRequestId(params.get("requestId") ?? "");

    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;

      const { data: requests } = await supabase
        .from("requests")
        .select("id, title, status, created_at")
        .or(`requester_id.eq.${uid},tutor_id.eq.${uid}`)
        .order("created_at", { ascending: false });

      const requestIds = ((requests ?? []) as Array<{ id: string }>).map((item) => item.id);
      const { data: details } = requestIds.length
        ? await supabase.from("request_details").select("request_id, requested_deadline").in("request_id", requestIds)
        : { data: [] as Array<{ request_id: string; requested_deadline: string | null }> };

      const detailMap = Object.fromEntries(((details ?? []) as Array<{ request_id: string; requested_deadline: string | null }>).map((item) => [item.request_id, item.requested_deadline]));
      setItems(
        (((requests ?? []) as Array<{ id: string; title: string; status: string; created_at: string }>).map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          date: detailMap[item.id] || item.created_at
        })))
      );
    };

    void load();
  }, []);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const calendarCells = Array.from({ length: Math.ceil((startDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - startDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
  });

  const itemsByDate = useMemo(() => {
    return items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
      const key = new Date(item.date).toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="flex min-h-[calc(100dvh-81px)] overflow-hidden bg-[#F9FAFB] text-[#111827]">
        <aside className="w-20 shrink-0 border-r border-[#E5E7EB] bg-white/98 lg:w-64">
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-8">
              <ToolLink href="/calendar" label="スケジュール" icon="📅" active />
              <ToolLink href="/chat" label="メッセージ" icon="💬" />
              <ToolLink href="/demo/request" label="申請状況" icon="📋" />
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-[#F9FAFB]/90 px-8 py-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#111827] md:text-4xl">スケジュール</h1>
                <p className="mt-1 text-sm text-[#6B7280]">依頼期限と予定をカレンダーで確認します。</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>前月</button>
                <button className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm" onClick={() => setCurrentDate(new Date())}>今月</button>
                <button className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>次月</button>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
            <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <p className="text-lg font-semibold text-[#111827]">
                {currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">進行中の依頼期限と相談予定日をまとめて確認できます。</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F9FAFB] text-center text-sm font-semibold text-[#6B7280]">
                {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
                  <div key={label} className="px-4 py-3">{label}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map((date, index) => {
                  const key = date ? date.toISOString().slice(0, 10) : `empty-${index}`;
                  const dayItems = date ? itemsByDate[key] ?? [] : [];
                  const isToday = date ? new Date().toDateString() === date.toDateString() : false;
                  return (
                    <div key={key} className="min-h-[150px] border-b border-r border-[#F3F4F6] p-3 align-top last:border-r-0">
                      {date ? (
                        <>
                          <div className={`mb-3 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-[#10B981] text-white" : "text-[#111827]"}`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-2">
                            {dayItems.map((item) => (
                              <Link key={item.id} href={`/chat?requestId=${item.id}`} className={`block rounded-xl px-3 py-2 text-xs ${selectedRequestId === item.id ? "bg-[#10B981] text-white" : "bg-[#F9FAFB] text-[#374151]"}`}>
                                <p className="line-clamp-1 font-semibold">{item.title}</p>
                                <p className={`mt-1 ${selectedRequestId === item.id ? "text-white/80" : "text-[#6B7280]"}`}>{statusLabel(item.status)}</p>
                              </Link>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-8 text-center text-xs text-[#6B7280]/70">© 2024 ユニブリ. All rights reserved.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
