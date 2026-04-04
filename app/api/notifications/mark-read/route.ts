import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

type Body = {
  ids?: string[];
  all?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json().catch(() => ({}))) as Body;
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    const markAll = Boolean(body.all);

    if (!markAll && ids.length === 0) {
      return NextResponse.json({ error: "ids or all is required" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (!markAll) query = query.in("id", ids);

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notifications";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
