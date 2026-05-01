import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

type BroadcastBody = {
  title?: string;
  body?: string;
  link?: string | null;
  targetRole?: "all" | "student" | "tutor" | "specific";
  targetUserId?: string;
};

type ProfileRoleRow = {
  role: string;
};

type ProfileIdRow = {
  id: string;
};

type TargetRole = "all" | "student" | "tutor" | "specific";

function getServiceRoleClient() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role env vars are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);

    const currentUser = await requireUserFromBearerToken(req);
    const supabaseAdmin = getServiceRoleClient();

    const { data: me, error: meError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle<ProfileRoleRow>();

    if (meError) {
      return NextResponse.json({ error: meError.message }, { status: 500 });
    }

    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const payload = (await req.json()) as BroadcastBody;
    const title = payload.title?.trim() ?? "";
    const body = payload.body?.trim() ?? "";
    const link = payload.link?.trim() || null;
    const targetRole: TargetRole =
      payload.targetRole === "student" || payload.targetRole === "tutor" || payload.targetRole === "specific"
        ? payload.targetRole
        : "all";
    const targetUserId = payload.targetUserId?.trim() ?? "";

    if (!title || !body) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    let recipients: ProfileIdRow[] = [];

    if (targetRole === "specific") {
      if (!targetUserId) {
        return NextResponse.json({ error: "targetUserId is required for specific target" }, { status: 400 });
      }

      const { data: user, error: userError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle<ProfileIdRow>();

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }

      if (!user) {
        return NextResponse.json({ error: "指定されたユーザーが見つかりません。" }, { status: 404 });
      }

      recipients = [user];
    } else {
      let usersQuery = supabaseAdmin.from("profiles").select("id");
      if (targetRole === "student" || targetRole === "tutor") {
        usersQuery = usersQuery.eq("role", targetRole);
      }

      const { data: users, error: usersError } = await usersQuery;

      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
      }

      recipients = (users ?? []) as ProfileIdRow[];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sentCount: 0, message: "送信対象ユーザーが存在しません。" });
    }

    const notifications = recipients.map((profile) => ({
      user_id: profile.id,
      title,
      body,
      href: link,
      type: "system",
      is_read: false
    }));

    const batches = chunkArray(notifications, 500);
    for (const batch of batches) {
      const { error: insertError } = await supabaseAdmin.from("notifications").insert(batch);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      sentCount: notifications.length,
      message: `${notifications.length}人にお知らせを送信しました。`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send broadcast";
    const status =
      message.includes("Missing Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
