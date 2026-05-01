import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";

type TargetRole = "all" | "student" | "tutor" | "specific_tutor";

type BroadcastBody = {
  title?: string;
  body?: string;
  link?: string | null;
  targetRole?: TargetRole;
  targetUserId?: string | null;
};

type ProfileIdRow = {
  id: string;
};

const TUTOR_ROLES = ["tutor", "university", "mentor", "university_student", "college_student", "大学生", "先輩"];

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
    const { user: currentUser, supabaseAdmin } = await requireStrictAdminFromBearer(req);

    const limit = await consumeRateLimit(`admin:broadcast:${currentUser.id}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const payload = (await req.json()) as BroadcastBody;
    const title = payload.title?.trim() ?? "";
    const body = payload.body?.trim() ?? "";
    const link = payload.link?.trim() || null;
    const targetRole: TargetRole =
      payload.targetRole === "student" || payload.targetRole === "tutor" || payload.targetRole === "specific_tutor"
        ? payload.targetRole
        : "all";
    const targetUserId = payload.targetUserId?.trim() || null;

    if (!title || !body) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    let usersQuery = supabaseAdmin.from("profiles").select("id");
    if (targetRole === "student") {
      usersQuery = usersQuery.eq("role", targetRole);
    } else if (targetRole === "tutor") {
      usersQuery = usersQuery.in("role", TUTOR_ROLES);
    } else if (targetRole === "specific_tutor") {
      if (!targetUserId) {
        return NextResponse.json({ error: "targetUserId is required for specific_tutor" }, { status: 400 });
      }
      usersQuery = usersQuery.eq("id", targetUserId).in("role", TUTOR_ROLES);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const recipients = (users ?? []) as ProfileIdRow[];
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
        : message.includes("CSRF blocked") || message.includes("Admin")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
