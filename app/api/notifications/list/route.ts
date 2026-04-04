import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

export async function GET(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 30), 1), 200);

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, href, type, is_read, created_at")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      const schemaMissing =
        error.message.includes("notifications") &&
        (error.message.includes("schema cache") ||
          error.message.includes("does not exist") ||
          error.message.includes("Could not find"));
      if (schemaMissing) {
        return NextResponse.json({ ok: true, items: [], unreadCount: 0, schemaReady: false });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unreadCount = (data ?? []).reduce((acc, item) => acc + (item.is_read ? 0 : 1), 0);
    return NextResponse.json({ ok: true, items: data ?? [], unreadCount, schemaReady: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
