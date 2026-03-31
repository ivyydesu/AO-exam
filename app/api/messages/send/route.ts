import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { sanitizePlainText, isSafeHttpUrl } from "../../../../lib/security/input";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

type Body = {
  requestId: string;
  type: "text" | "file";
  content?: string;
  file?: {
    name: string;
    mimeType: string;
    size: number;
    url: string;
    path?: string;
  };
};

const BLOCKED_STATUSES = new Set(["rejected", "canceled", "cancelled"]);

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`messages:send:${user.id}`, 40, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `送信回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as Body;
    const requestId = String(body.requestId ?? "").trim();
    if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: requestRow } = await supabaseAdmin
      .from("requests")
      .select("id, status, requester_id, tutor_id, stripe_payment_intent_id")
      .eq("id", requestId)
      .single();
    if (!requestRow) return NextResponse.json({ error: "request not found" }, { status: 404 });
    if (requestRow.requester_id !== user.id && requestRow.tutor_id !== user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    if (BLOCKED_STATUSES.has(requestRow.status)) {
      return NextResponse.json({ error: "このステータスではメッセージ送信できません" }, { status: 400 });
    }

    let content = "";
    let message_kind: "chat" | "file" | "prepay" = "chat";
    const prepayMode = !requestRow.stripe_payment_intent_id && !["escrowed", "in_progress", "review_pending", "completed"].includes(requestRow.status);

    if (body.type === "file") {
      const f = body.file;
      if (!f || !f.name || !f.mimeType || !isSafeHttpUrl(f.url) || Number(f.size) <= 0) {
        return NextResponse.json({ error: "invalid file payload" }, { status: 400 });
      }
      content = JSON.stringify({
        kind: "file",
        text: "",
        file: {
          name: sanitizePlainText(String(f.name), 200),
          mimeType: sanitizePlainText(String(f.mimeType), 100),
          size: Number(f.size),
          path: sanitizePlainText(String(f.path ?? ""), 300),
          url: f.url
        }
      });
      message_kind = prepayMode ? "prepay" : "file";
    } else {
      const text = sanitizePlainText(String(body.content ?? ""), 2000);
      if (!text) return NextResponse.json({ error: "message is empty" }, { status: 400 });
      content = text;
      message_kind = prepayMode ? "prepay" : "chat";
    }

    let insertError = (
      await supabaseAdmin.from("messages").insert({
        request_id: requestId,
        sender_id: user.id,
        content,
        message_kind
      })
    ).error;
    if (insertError && insertError.message.includes("column")) {
      insertError = (
        await supabaseAdmin.from("messages").insert({
          request_id: requestId,
          sender_id: user.id,
          content
        })
      ).error;
    }
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "message send failed";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
