import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { sendLinePushMessage } from "../../../../lib/line";
import { getAppModeFromRequest } from "../../../../lib/appMode";
import { getNotificationSettingsForUser } from "../../../../lib/notificationSettings";

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

const DURATION_BASE_PRICE: Record<string, number> = {
  "15m": 3000,
  "30m": 5000,
  "60m": 9000,
  "120m": 15000,
  "180m": 22000
};

function calculateSuggestedPrice(topic: string, method: string, duration: string) {
  const base = DURATION_BASE_PRICE[duration] ?? 5000;
  const topicBoost = topic === "essay_review" ? 2000 : topic === "interview_prep" ? 3000 : 0;
  const methodBoost = method === "online_mtg" ? 2000 : 0;
  return Math.max(3000, base + topicBoost + methodBoost);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requesterId = String(body.requesterId ?? "");
    const tutorId = String(body.tutorId ?? "");
    const supportTopic = String(body.supportTopic ?? "");
    const supportTopicOther = String(body.supportTopicOther ?? "");
    const supportMethod = String(body.supportMethod ?? "");
    const estimatedDuration = String(body.estimatedDuration ?? "");
    const requestedDeadline = String(body.requestedDeadline ?? "");
    const requestedPrice = Number(body.requestedPrice ?? 0);
    const dryRun = Boolean(body.dryRun);
    const appMode = getAppModeFromRequest(req);
    const allowTestBypass = process.env.NODE_ENV !== "production" && appMode === "test";

    if (!requesterId || !tutorId || !supportTopic || !supportMethod || !estimatedDuration || !requestedDeadline) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    if (!TOPIC_LABELS[supportTopic] || !METHOD_LABELS[supportMethod] || !DURATION_LABELS[estimatedDuration]) {
      return NextResponse.json({ error: "入力値が不正です" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", requesterId)
      .single();
    if (requesterError || !requester || requester.role !== "student") {
      return NextResponse.json({ error: "依頼者情報が不正です" }, { status: 403 });
    }

    const { data: tutor, error: tutorError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, line_user_id")
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
      supportTopic === "other" && supportTopicOther
        ? `その他: ${supportTopicOther}`
        : TOPIC_LABELS[supportTopic];
    const methodLabel = METHOD_LABELS[supportMethod];
    const durationLabel = DURATION_LABELS[estimatedDuration];
    const suggestedPrice = calculateSuggestedPrice(supportTopic, supportMethod, estimatedDuration);
    const safeRequestedPrice = requestedPrice > 0 ? requestedPrice : suggestedPrice;

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
        preview: {
          title,
          description,
          suggestedPrice,
          requestedPrice: safeRequestedPrice
        }
      });
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("requests")
      .insert({
        requester_id: requesterId,
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
      detailError?.message?.includes("request_details") &&
      detailError?.message?.includes("schema cache");

    if (detailError && !(allowTestBypass && missingRequestDetails)) {
      await supabaseAdmin.from("requests").delete().eq("id", requestRow.id);
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    let lineNotify = {
      attempted: Boolean(tutorLineUserId),
      sent: false,
      error: null as string | null
    };

    if (tutorLineUserId) {
      const tutorSettings = await getNotificationSettingsForUser(supabaseAdmin, resolvedTutorId as string);
      if (!(tutorSettings.line_enabled && tutorSettings.line_new_request)) {
        lineNotify.attempted = false;
        lineNotify.error = "LINE disabled by notification settings";
      } else {
        try {
          await sendLinePushMessage(
            tutorLineUserId,
            `AO Match: 新しい依頼が届きました。\n${title}\n依頼詳細を確認してください。`
          );
          lineNotify.sent = true;
        } catch {
          lineNotify.error = "LINE push failed";
        }
      }
    }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
