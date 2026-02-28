import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export type CallAccessContext = {
  request: {
    id: string;
    title: string;
    status: string;
    requester_id: string;
    tutor_id: string | null;
  };
  detail: {
    support_method: string | null;
  } | null;
  role: "student" | "tutor";
  counterpartyId: string | null;
  canManage: boolean;
};

export async function getCallAccessContext(
  supabaseAdmin: SupabaseClient,
  requestId: string,
  userId: string,
  options?: { testMode?: boolean }
): Promise<CallAccessContext> {
  const { data: requestRow, error: requestError } = await supabaseAdmin
    .from("requests")
    .select("id, title, status, requester_id, tutor_id")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw new Error("対象の相談が見つかりません");
  }

  const role =
    requestRow.requester_id === userId
      ? "student"
      : requestRow.tutor_id === userId
        ? "tutor"
        : null;

  if (!role) {
    throw new Error("この通話ルームに入室する権限がありません");
  }

  const testMode = Boolean(options?.testMode);

  if (!testMode && !["escrowed", "in_progress", "review_pending", "completed"].includes(requestRow.status)) {
    throw new Error("このステータスでは通話を開始できません");
  }

  const { data: detail } = await supabaseAdmin
    .from("request_details")
    .select("support_method")
    .eq("request_id", requestId)
    .maybeSingle();

  if (!testMode && detail?.support_method && !detail.support_method.includes("オンライン")) {
    throw new Error("この依頼はオンライン面談対象ではありません");
  }

  return {
    request: requestRow,
    detail: detail ?? null,
    role,
    counterpartyId: role === "student" ? requestRow.tutor_id : requestRow.requester_id,
    canManage: role === "tutor"
  };
}

export function generateRoomName(requestId: string) {
  return `ao-match-${requestId}-${randomBytes(6).toString("hex")}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

export function generateRoomPassword() {
  return randomBytes(9).toString("base64url");
}
