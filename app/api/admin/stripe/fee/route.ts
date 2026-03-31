import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";
import { DEFAULT_PLATFORM_FEE_PERCENT, getPlatformFeePercent } from "../../../../../lib/platformFee";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

function normalizePercent(input: unknown) {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 95) return null;
  return Math.floor(n);
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const percent = await getPlatformFeePercent(supabaseAdmin);
    const { ip, userAgent } = getRequestMeta(req);
    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "admin_fee_viewed",
      resource_type: "platform_settings",
      resource_id: "platform_fee_percent",
      result: "success",
      ip,
      user_agent: userAgent
    });
    return NextResponse.json({
      ok: true,
      percent,
      fallbackPercent: DEFAULT_PLATFORM_FEE_PERCENT
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Admin only" ? 403 : 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const { user, supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const limit = await consumeRateLimit(`admin:stripe:fee:${user.id}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const { ip, userAgent } = getRequestMeta(req);
    const body = await req.json().catch(() => ({}));
    const percent = normalizePercent(body?.percent);
    if (percent == null) {
      return NextResponse.json({ error: "percent must be an integer between 0 and 95" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("platform_settings").upsert(
      {
        key: "platform_fee_percent",
        value: String(percent),
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    );
    if (error) {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "admin_fee_update_failed",
        resource_type: "platform_settings",
        resource_id: "platform_fee_percent",
        result: "failure",
        detail: error.message,
        ip,
        user_agent: userAgent
      });
      return NextResponse.json(
        { error: "DBに保存できませんでした。platform_settings テーブルを作成してください。" },
        { status: 503 }
      );
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "admin_fee_updated",
      resource_type: "platform_settings",
      resource_id: "platform_fee_percent",
      result: "success",
      detail: `percent=${percent}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({ ok: true, percent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") || message === "Admin only" ? 403 : 401 }
    );
  }
}
