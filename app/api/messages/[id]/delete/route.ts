import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { writeSecurityAudit } from "../../../../../lib/security/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`messages:delete:${user.id}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `操作が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const messageId = String(params.id ?? "").trim();
    if (!messageId) return NextResponse.json({ error: "message id is required" }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();
    const [{ data: me }, { data: message }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, role").eq("id", user.id).maybeSingle(),
      supabaseAdmin
        .from("messages")
        .select("id, sender_id")
        .eq("id", messageId)
        .maybeSingle()
    ]);

    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const canDelete = message.sender_id === user.id || me?.role === "admin";
    if (!canDelete) return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });

    const softDelete = await supabaseAdmin
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        content: "このメッセージは削除されました。"
      })
      .eq("id", messageId);

    if (softDelete.error) {
      const hardDelete = await supabaseAdmin.from("messages").delete().eq("id", messageId);
      if (hardDelete.error) {
        return NextResponse.json({ error: hardDelete.error.message }, { status: 500 });
      }
    }
    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "message_deleted",
      resource_type: "message",
      resource_id: messageId,
      result: "success",
      ip: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete message";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
