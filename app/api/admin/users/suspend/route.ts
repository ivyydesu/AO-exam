import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

type SuspendBody = {
  userId: string;
  suspended: boolean;
  suspendedUntil?: string | null;
  reason?: string | null;
};

function isMissingSuspendColumns(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("is_suspended") ||
    lower.includes("suspended_until") ||
    lower.includes("suspended_reason")
  );
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const { user: currentUser, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const limit = await consumeRateLimit(`admin:users:suspend:${currentUser.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const body = (await req.json()) as SuspendBody;
    const { ip, userAgent } = getRequestMeta(req);

    if (!body.userId || typeof body.suspended !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (body.userId === currentUser.id) {
      return NextResponse.json({ error: "自分自身の停止はできません" }, { status: 400 });
    }

    let suspendedUntil: string | null = null;
    if (body.suspended) {
      if (body.suspendedUntil) {
        const parsed = new Date(body.suspendedUntil);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "suspendedUntil が不正です" }, { status: 400 });
        }
        suspendedUntil = parsed.toISOString();
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_suspended: body.suspended,
        suspended_until: body.suspended ? suspendedUntil : null,
        suspended_reason: body.suspended ? (body.reason ?? null) : null
      })
      .eq("id", body.userId);

    if (error) {
      if (isMissingSuspendColumns(error.message)) {
        return NextResponse.json(
          { error: "DB migration not applied: profiles suspension columns are missing. Run supabase/schema.sql." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: currentUser.id,
      event_type: body.suspended ? "admin_user_suspended" : "admin_user_unsuspended",
      resource_type: "user",
      resource_id: body.userId,
      result: "success",
      detail: body.suspended ? `until=${suspendedUntil || "none"} reason=${body.reason || "-"}` : "reactivated",
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") || message.includes("Admin") ? 403 : 401 }
    );
  }
}
