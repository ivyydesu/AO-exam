import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../lib/security/audit";
import { getRequestMeta } from "../../../../lib/security/requestMeta";

type ReviewBody = {
  userId: string;
  status: "approved" | "rejected";
  reason?: string;
};

function isMissingVerificationTable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("tutor_verifications") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("relation"))
  );
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const { user: currentUser, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const limit = await consumeRateLimit(`verification:review:${currentUser.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const body = (await req.json()) as ReviewBody;
    const { ip, userAgent } = getRequestMeta(req);
    if (!body.userId || !body.status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("tutor_verifications")
      .update({
        status: body.status,
        reason: body.reason ?? null,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", body.userId);

    if (error) {
      if (isMissingVerificationTable(error.message)) {
        return NextResponse.json(
          {
            error:
              "DB migration not applied: table tutor_verifications is missing. Run supabase/schema.sql in Supabase SQL Editor."
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: currentUser.id,
      event_type: body.status === "approved" ? "verification_approved" : "verification_rejected",
      resource_type: "verification",
      resource_id: body.userId,
      result: "success",
      detail: body.reason ?? null,
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
