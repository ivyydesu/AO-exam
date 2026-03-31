import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

type RequestRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  requester_id: string;
  tutor_id: string | null;
};

type MessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  expires_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  school: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { user, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const { ip, userAgent } = getRequestMeta(req);

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const selectedRequestId = (req.nextUrl.searchParams.get("requestId") ?? "").trim();

    const { data: requests, error: requestError } = await supabaseAdmin
      .from("requests")
      .select("id, title, status, created_at, requester_id, tutor_id")
      .order("created_at", { ascending: false })
      .limit(100);

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 400 });
    }

    const requestRows = (requests ?? []) as RequestRow[];
    const userIds = Array.from(
      new Set(
        requestRows.flatMap((item) => [item.requester_id, item.tutor_id].filter(Boolean) as string[])
      )
    );

    const [{ data: profiles, error: profilesError }, { data: messages, error: messagesError }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, role, school").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      selectedRequestId
        ? supabaseAdmin
            .from("messages")
            .select("id, request_id, sender_id, content, expires_at, deleted_at, created_at")
            .eq("request_id", selectedRequestId)
            .order("created_at", { ascending: true })
            .limit(300)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }
    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 400 });
    }

    const profileMap = Object.fromEntries(
      ((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item])
    );

    const filteredRequests = requestRows.filter((item) => {
      if (!q) return true;
      const requester = profileMap[item.requester_id];
      const tutor = item.tutor_id ? profileMap[item.tutor_id] : null;
      return [item.title, item.status, requester?.full_name, requester?.school, tutor?.full_name, tutor?.school]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });

    const response = {
      requests: filteredRequests.map((item) => ({
        ...item,
        requester_name: profileMap[item.requester_id]?.full_name ?? "不明",
        requester_role: profileMap[item.requester_id]?.role ?? "student",
        tutor_name: item.tutor_id ? profileMap[item.tutor_id]?.full_name ?? "未割当" : "未割当",
        tutor_role: item.tutor_id ? profileMap[item.tutor_id]?.role ?? "tutor" : null
      })),
      messages: ((messages ?? []) as MessageRow[]).filter((row) => {
        if (row.deleted_at) return false;
        if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
        return true;
      })
    };

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "admin_chats_list_viewed",
      resource_type: "admin",
      result: "success",
      detail: `requestId=${selectedRequestId || "-"} q=${q || "-"}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Admin") ? 403 : 401 }
    );
  }
}
