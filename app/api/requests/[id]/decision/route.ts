import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { sendLinePushMessage } from "../../../../../lib/line";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requestId = params.id;
    const body = await req.json();
    const tutorId = String(body.tutorId ?? "");
    const action = String(body.action ?? "");

    if (!requestId || !tutorId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("requests_with_profile")
      .select("id, status, tutor_id, requester_id, title")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { data: tutor, error: tutorError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", tutorId)
      .single();
    if (tutorError || !tutor || tutor.role !== "tutor") {
      return NextResponse.json({ error: "Tutor not found" }, { status: 403 });
    }

    if (requestRow.tutor_id && requestRow.tutor_id !== tutorId) {
      return NextResponse.json({ error: "この依頼の担当ではありません" }, { status: 403 });
    }

    if (!["draft", "rejected", "accepted"].includes(requestRow.status)) {
      return NextResponse.json({ error: `現在のステータスでは操作できません: ${requestRow.status}` }, { status: 400 });
    }

    if (action === "approve") {
      const { error: updateError } = await supabaseAdmin
        .from("requests")
        .update({
          tutor_id: tutorId,
          status: "accepted"
        })
        .eq("id", requestId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      const { data: requester } = await supabaseAdmin
        .from("profiles")
        .select("line_user_id")
        .eq("id", requestRow.requester_id)
        .maybeSingle();

      if (requester?.line_user_id) {
        try {
          await sendLinePushMessage(
            requester.line_user_id,
            `AO Match: 依頼が承認されました。\n${requestRow.title}\nカード与信に進んでください。`
          );
        } catch {
          // 通知失敗は処理続行
        }
      }

      return NextResponse.json({ ok: true, status: "accepted" });
    }

    const { error: rejectError } = await supabaseAdmin
      .from("requests")
      .update({
        tutor_id: tutorId,
        status: "rejected"
      })
      .eq("id", requestId);
    if (rejectError) {
      return NextResponse.json({ error: rejectError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
