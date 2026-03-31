import { NextRequest, NextResponse } from "next/server";
import { requireUserFromBearerToken } from "../../../../../lib/auth/requireUser";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { assertTrustedOrigin } from "../../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../../lib/security/audit";
import { getRequestMeta } from "../../../../../lib/security/requestMeta";

const BUCKET = "call-attachments";
const MAX_BYTES = 20 * 1024 * 1024;

async function ensureBucket() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if ((buckets ?? []).some((bucket: { id: string }) => bucket.id === BUCKET)) return;
  await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`calls:attachments:${user.id}`, 25, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { ip, userAgent } = getRequestMeta(req);

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("requests")
      .select("id, requester_id, tutor_id")
      .eq("id", params.id)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "依頼情報が見つかりません" }, { status: 404 });
    }

    if (user.id !== requestRow.requester_id && user.id !== requestRow.tutor_id) {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "call_attachment_denied",
        resource_type: "call",
        resource_id: params.id,
        result: "failure",
        detail: "participant mismatch",
        ip,
        user_agent: userAgent
      });
      return NextResponse.json({ error: "この通話ファイルにアクセスする権限がありません" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "空のファイルは送信できません" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ファイルは20MB以下にしてください" }, { status: 400 });
    }

    await ensureBucket();

    const fileName = safeName(file.name || "attachment");
    const path = `${params.id}/${user.id}/${Date.now()}-${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || "プレビューURLの生成に失敗しました" }, { status: 400 });
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "call_attachment_uploaded",
      resource_type: "call",
      resource_id: params.id,
      result: "success",
      detail: `file=${file.name} size=${file.size}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({
      ok: true,
      file: {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        sizeLabel:
          file.size >= 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : file.size >= 1024
              ? `${Math.round(file.size / 1024)} KB`
              : `${file.size} B`,
        path,
        url: signedData.signedUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ファイルアップロードに失敗しました";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") ? 403 : 500 }
    );
  }
}
