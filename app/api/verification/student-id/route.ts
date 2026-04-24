import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../lib/security/audit";
import { getRequestMeta } from "../../../../lib/security/requestMeta";
import sharp from "sharp";

const STUDENT_IDS_BUCKET = "student-ids";
const OPTIONAL_VERIFICATION_COLUMNS = [
  "student_id_front_image_path",
  "student_id_back_image_path",
  "admission_year",
  "graduation_year"
] as const;

function isMissingVerificationTable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("tutor_verifications") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("relation"))
  );
}

function isMissingColumnError(message: string, column: string) {
  return message.includes(`column "${column}"`) || message.includes(`column ${column}`) || message.includes(`'${column}'`);
}

async function upsertVerificationWithFallback(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  payload: Record<string, unknown>
) {
  const droppedColumns = new Set<string>();
  const nextPayload: Record<string, unknown> = { ...payload };
  let lastError: { message: string } | null = null;

  for (let i = 0; i < OPTIONAL_VERIFICATION_COLUMNS.length + 2; i += 1) {
    const { error } = await supabaseAdmin
      .from("tutor_verifications")
      .upsert(nextPayload, { onConflict: "user_id" });

    if (!error) {
      return { error: null, droppedColumns };
    }

    lastError = error;
    const missing = OPTIONAL_VERIFICATION_COLUMNS.find(
      (column) => column in nextPayload && isMissingColumnError(error.message, column)
    );
    if (!missing) break;

    delete nextPayload[missing];
    droppedColumns.add(missing);
  }

  return { error: lastError, droppedColumns };
}

async function ensureStudentIdsBucket() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(`Bucket list failed: ${listError.message}`);
  }
  if ((buckets ?? []).some((bucket) => bucket.id === STUDENT_IDS_BUCKET)) {
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(STUDENT_IDS_BUCKET, {
    public: false
  });
  const alreadyExists = createError?.message ? /already|exists/i.test(createError.message) : false;
  if (createError && !alreadyExists) {
    throw new Error(`Bucket create failed: ${createError.message}`);
  }
}

let ensuredStudentIdsBucket = false;
async function ensureStudentIdsBucketOnce() {
  if (ensuredStudentIdsBucket) return;
  await ensureStudentIdsBucket();
  ensuredStudentIdsBucket = true;
}

function isLikelyAuthError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("bearer") ||
    lower.includes("access token") ||
    lower.includes("jwt")
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const primary = await supabaseAdmin
      .from("tutor_verifications")
      .select("id, status, reason, student_id_front_image_path, student_id_back_image_path, admission_year, graduation_year, reviewed_at, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (primary.error) {
      if (isMissingVerificationTable(primary.error.message)) {
        return NextResponse.json(
          {
            error:
              "DB migration not applied: table tutor_verifications is missing. Run supabase/schema.sql in Supabase SQL Editor."
          },
          { status: 503 }
        );
      }

      const fallback = await supabaseAdmin
        .from("tutor_verifications")
        .select("id, status, reason, student_id_image_path, reviewed_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      return NextResponse.json({
        verification: fallback.data
          ? {
              ...fallback.data,
              student_id_front_image_path: fallback.data.student_id_image_path,
              student_id_back_image_path: null,
              admission_year: null,
              graduation_year: null
            }
          : null
      });
    }

    return NextResponse.json({ verification: primary.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const limit = await consumeRateLimit(`verification:student-id:${user.id}`, 8, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Retry in ${limit.retryAfterSec}s.` },
        { status: 429 }
      );
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { ip, userAgent } = getRequestMeta(req);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.role !== "tutor") {
      await writeSecurityAudit(supabaseAdmin, {
        actor_id: user.id,
        event_type: "verification_submit_denied",
        resource_type: "verification",
        result: "failure",
        detail: "Only tutors can submit student ID",
        ip,
        user_agent: userAgent
      });
      return NextResponse.json({ error: "Only tutors can submit student ID" }, { status: 403 });
    }

    const form = await req.formData();
    const frontFile = form.get("studentIdImageFront");
    const backFile = form.get("studentIdImageBack");
    const admissionYear = String(form.get("admissionYear") ?? "").trim();
    const graduationYear = String(form.get("graduationYear") ?? "").trim();
    if (!(frontFile instanceof File) || !(backFile instanceof File)) {
      return NextResponse.json({ error: "学生証の表・裏画像が必要です" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowed.includes(frontFile.type) || !allowed.includes(backFile.type)) {
      return NextResponse.json({ error: "jpeg/png/webp/heic/heif のみ対応しています" }, { status: 400 });
    }
    if (frontFile.size > 3 * 1024 * 1024 || backFile.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは表・裏ともに3MB以下にしてください" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(admissionYear) || !/^\d{4}$/.test(graduationYear)) {
      return NextResponse.json({ error: "入学年度・卒業予定年度は4桁の西暦で入力してください" }, { status: 400 });
    }
    if (Number(graduationYear) < Number(admissionYear)) {
      return NextResponse.json({ error: "卒業予定年度は入学年度以降にしてください" }, { status: 400 });
    }

    const frontBytes = await frontFile.arrayBuffer();
    const backBytes = await backFile.arrayBuffer();

    async function normalizeUploadImage(
      rawBuffer: Buffer,
      mimeType: string
    ): Promise<{ buffer: Buffer; contentType: string; extension: "jpg" | "png" | "webp" | "heic" | "heif" }> {
      // HEIC/HEIF は可能なら JPEG に変換。
      // サーバー環境の sharp/libvips が HEIF 未対応の場合は元ファイルをそのまま保存して処理継続。
      if (mimeType === "image/heic" || mimeType === "image/heif") {
        try {
          const converted = await sharp(rawBuffer).jpeg({ quality: 85 }).toBuffer();
          return { buffer: converted, contentType: "image/jpeg", extension: "jpg" };
        } catch {
          return {
            buffer: rawBuffer,
            contentType: mimeType,
            extension: mimeType === "image/heif" ? "heif" : "heic"
          };
        }
      }
      if (mimeType === "image/png") {
        return { buffer: rawBuffer, contentType: "image/png", extension: "png" };
      }
      if (mimeType === "image/webp") {
        return { buffer: rawBuffer, contentType: "image/webp", extension: "webp" };
      }
      return { buffer: rawBuffer, contentType: "image/jpeg", extension: "jpg" };
    }

    const frontNormalized = await normalizeUploadImage(Buffer.from(frontBytes), frontFile.type);
    const backNormalized = await normalizeUploadImage(Buffer.from(backBytes), backFile.type);
    const frontBuffer = frontNormalized.buffer;
    const backBuffer = backNormalized.buffer;
    const frontExtension = frontNormalized.extension;
    const backExtension = backNormalized.extension;
    const base = `${user.id}/${Date.now()}`;
    const frontPath = `${base}-student-id-front.${frontExtension}`;
    const backPath = `${base}-student-id-back.${backExtension}`;

    await ensureStudentIdsBucketOnce();

    const [frontUpload, backUpload] = await Promise.all([
      supabaseAdmin.storage
        .from(STUDENT_IDS_BUCKET)
        .upload(frontPath, frontBuffer, {
          contentType: frontNormalized.contentType,
          upsert: false
        }),
      supabaseAdmin.storage
        .from(STUDENT_IDS_BUCKET)
        .upload(backPath, backBuffer, {
          contentType: backNormalized.contentType,
          upsert: false
        })
    ]);

    if (frontUpload.error || backUpload.error) {
      // 片方だけ成功した場合の孤児ファイルを削除
      const removeTargets: string[] = [];
      if (!frontUpload.error) removeTargets.push(frontPath);
      if (!backUpload.error) removeTargets.push(backPath);
      if (removeTargets.length > 0) {
        await supabaseAdmin.storage.from(STUDENT_IDS_BUCKET).remove(removeTargets);
      }
      return NextResponse.json(
        { error: frontUpload.error?.message ?? backUpload.error?.message ?? "アップロードに失敗しました" },
        { status: 400 }
      );
    }

    const upsertPayload = {
      user_id: user.id,
      student_id_image_path: frontPath,
      student_id_front_image_path: frontPath,
      student_id_back_image_path: backPath,
      admission_year: Number(admissionYear),
      graduation_year: Number(graduationYear),
      status: "pending",
      reason: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString()
    };
    const upsertResult = await upsertVerificationWithFallback(supabaseAdmin, upsertPayload);
    const upsertError = upsertResult.error;

    if (upsertError) {
      await supabaseAdmin.storage.from(STUDENT_IDS_BUCKET).remove([frontPath, backPath]).catch(() => undefined);
      if (isMissingVerificationTable(upsertError.message)) {
        return NextResponse.json(
          {
            error:
              "DB migration not applied: table tutor_verifications is missing. Run supabase/schema.sql in Supabase SQL Editor."
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    if (upsertResult.droppedColumns.has("student_id_back_image_path")) {
      await supabaseAdmin.storage.from(STUDENT_IDS_BUCKET).remove([backPath]).catch(() => undefined);
    }

    await writeSecurityAudit(supabaseAdmin, {
      actor_id: user.id,
      event_type: "verification_submitted",
      resource_type: "verification",
      resource_id: user.id,
      result: "success",
      detail: `admission=${admissionYear} graduation=${graduationYear}`,
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("CSRF blocked")
      ? 403
      : isLikelyAuthError(message)
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
