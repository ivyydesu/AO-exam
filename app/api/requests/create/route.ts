import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { sendLinePushMessage } from "../../../../lib/line";
import { getAppModeFromRequest } from "../../../../lib/appMode";
import { getNotificationSettingsForUser } from "../../../../lib/notificationSettings";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { sanitizePlainText } from "../../../../lib/security/input";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../lib/security/audit";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

const TOPIC_LABELS: Record<string, string> = {
  university_talk: "大学のことをざっくばらんに教えてほしい",
  theme_consult: "探究テーマの相談に乗ってほしい",
  essay_review: "志望理由書を見てほしい",
  interview_prep: "2次対策を手伝ってほしい",
  other: "その他"
};

const METHOD_LABELS: Record<string, string> = {
  text: "文章ベースのやり取り",
  online_mtg: "オンラインMTG"
};

const DURATION_LABELS: Record<string, string> = {
  "15m": "15分",
  "30m": "30分",
  "60m": "1時間",
  "120m": "2時間",
  "180m": "3時間"
};

const FIXED_REQUEST_PRICE = 2200;

function calculateSuggestedPrice(_topic: string, _method: string, _duration: string) {
  return FIXED_REQUEST_PRICE;
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`requests:create:${user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `送信回数が多すぎます。${limit.retryAfterSec}秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const tutorId = String(body.tutorId ?? "");
    const supportTopic = String(body.supportTopic ?? "");
    const supportTopicOther = sanitizePlainText(String(body.supportTopicOther ?? ""), 200);
    const supportMethod = String(body.supportMethod ?? "");
    const estimatedDuration = String(body.estimatedDuration ?? "");
    const requestedDeadline = String(body.requestedDeadline ?? "");
    const dryRun = Boolean(body.dryRun);
    const appMode = getAppModeFromRequest(req);
    const allowTestBypass = process.env.NODE_ENV !== "production" && appMode === "test";

    if (!tutorId || !supportTopic || !supportMethod || !estimatedDuration || !requestedDeadline) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    if (!TOPIC_LABELS[supportTopic] || !METHOD_LABELS[supportMethod] || !DURATION_LABELS[estimatedDuration]) {
      return NextResponse.json({ error: "入力値が不正です" }, { status: 400 });
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();
    if (requesterError || !requester || requester.role !== "student") {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "request_create_blocked",
        resource_type: "request",
        result: "failure",
        detail: "invalid requester role",
        ip: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent")
      });
      return NextResponse.json({ error: "依頼者情報が不正です" }, { status: 403 });
    }

    const { data: tutor } = await supabaseAdmin
      .from("profiles")
      .select("id, role, line_user_id")
      .eq("id", tutorId)
      .single();
    let resolvedTutorId: string | null = tutor?.role === "tutor" ? tutor.id : null;
    let tutorLineUserId: string | null = tutor?.role === "tutor" ? tutor.line_user_id ?? null : null;

    if (!resolvedTutorId && !allowTestBypass) {
      return NextResponse.json({ error: "先輩情報が不正です" }, { status: 403 });
    }

    if (!resolvedTutorId && allowTestBypass) {
      const { data: fallbackTutor } = await supabaseAdmin
        .from("profiles")
        .select("id, line_user_id")
        .eq("role", "tutor")
        .limit(1)
        .maybeSingle();
      resolvedTutorId = fallbackTutor?.id ?? null;
      tutorLineUserId = fallbackTutor?.line_user_id ?? null;
    }

    if (!resolvedTutorId && !allowTestBypass) {
      return NextResponse.json({ error: "先輩情報が見つかりません" }, { status: 400 });
    }

    const topicLabel =
      supportTopic === "other" && supportTopicOther ? `その他: ${supportTopicOther}` : TOPIC_LABELS[supportTopic];
    const methodLabel = METHOD_LABELS[supportMethod];
    const durationLabel = DURATION_LABELS[estimatedDuration];
    const suggestedPrice = calculateSuggestedPrice(supportTopic, supportMethod, estimatedDuration);
    // 本番方針: 申請時の相場を一律 2,200 円に統一
    const safeRequestedPrice = FIXED_REQUEST_PRICE;

    const title = `AO相談: ${topicLabel}`;
    const description = [
      `相談内容: ${topicLabel}`,
      `方法: ${methodLabel}`,
      `想定時間: ${durationLabel}`,
      `希望期限: ${requestedDeadline}`
    ].join("\n");

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        mode: appMode,
        warning: !resolvedTutorId ? "テストモード: tutor未登録のため未割当で作成されます" : null,
        preview: { title, description, suggestedPrice, requestedPrice: safeRequestedPrice }
      });
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("requests")
      .insert({
        requester_id: user.id,
        tutor_id: resolvedTutorId,
        title,
        description,
        budget: safeRequestedPrice,
        status: "draft"
      })
      .select("id")
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: requestError?.message ?? "依頼作成に失敗しました" }, { status: 500 });
    }

    const { error: detailError } = await supabaseAdmin.from("request_details").insert({
      request_id: requestRow.id,
      support_topic: topicLabel,
      support_method: methodLabel,
      estimated_duration: durationLabel,
      requested_deadline: requestedDeadline,
      suggested_price: suggestedPrice,
      requested_price: safeRequestedPrice
    });

    const missingRequestDetails =
      detailError?.message?.includes("request_details") && detailError?.message?.includes("schema cache");

    if (detailError && !(allowTestBypass && missingRequestDetails)) {
      await supabaseAdmin.from("requests").delete().eq("id", requestRow.id);
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    let lineNotify = { attempted: Boolean(tutorLineUserId), sent: false, error: null as string | null };
    if (tutorLineUserId) {
      const tutorSettings = await getNotificationSettingsForUser(supabaseAdmin, resolvedTutorId as string);
      if (!(tutorSettings.line_enabled && tutorSettings.line_new_request)) {
        lineNotify.attempted = false;
        lineNotify.error = "LINE disabled by notification settings";
      } else {
        try {
          await sendLinePushMessage(
            tutorLineUserId,
            `【ユニブリ 通知】新しい依頼が届きました\n--------------------------------\n件名: ${title}\n状態: 確認待ち\n次の操作: ユニブリで依頼内容を確認してください`
          );
          lineNotify.sent = true;
        } catch {
          lineNotify.error = "LINE push failed";
        }
      }
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "request_created",
      resource_type: "request",
      resource_id: requestRow.id,
      result: "success",
      ip: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent")
    });

    return NextResponse.json({
      ok: true,
      mode: appMode,
      warning:
        !resolvedTutorId
          ? "テストモード: tutor未登録のため未割当で作成しました"
          : allowTestBypass && missingRequestDetails
            ? "テストモード: request_details未作成のため詳細保存をスキップしました"
            : null,
      lineNotify,
      requestId: requestRow.id,
      suggestedPrice,
      requestedPrice: safeRequestedPrice
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "依頼作成に失敗しました";
    const status =
      message.includes("Authorization") || message.includes("Invalid user token")
        ? 401
        : message.includes("CSRF blocked")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
