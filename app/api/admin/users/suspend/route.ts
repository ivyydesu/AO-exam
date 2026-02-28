import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";

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
    const currentUser = await requireUserFromBearerToken(req);
    const body = (await req.json()) as SuspendBody;

    if (!body.userId || typeof body.suspended !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (body.userId === currentUser.id) {
      return NextResponse.json({ error: "自分自身の停止はできません" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
