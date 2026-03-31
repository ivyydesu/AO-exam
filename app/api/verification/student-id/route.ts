import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";
import { consumeRateLimit } from "../../../../lib/security/rateLimit";
import { writeSecurityAudit } from "../../../../lib/security/audit";
import { getRequestMeta } from "../../../../lib/security/requestMeta";

function isMissingVerificationTable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("tutor_verifications") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("relation"))
  );
}

async function ensureStudentIdsBucket() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(`Bucket list failed: ${listError.message}`);
  }

  const exists = (buckets ?? []).some((bucket) => bucket.id === "student-ids");
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket("student-ids", {
    public: false
  });
  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw new Error(`Bucket create failed: ${createError.message}`);
  }
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

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(frontFile.type) || !allowed.includes(backFile.type)) {
      return NextResponse.json({ error: "Only jpeg/png/webp are allowed" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(admissionYear) || !/^\d{4}$/.test(graduationYear)) {
      return NextResponse.json({ error: "入学年度・卒業予定年度は4桁の西暦で入力してください" }, { status: 400 });
    }
    if (Number(graduationYear) < Number(admissionYear)) {
      return NextResponse.json({ error: "卒業予定年度は入学年度以降にしてください" }, { status: 400 });
    }

    const frontBytes = await frontFile.arrayBuffer();
    const backBytes = await backFile.arrayBuffer();
    const frontBuffer = Buffer.from(frontBytes);
    const backBuffer = Buffer.from(backBytes);
    const frontExtension = frontFile.type === "image/png" ? "png" : frontFile.type === "image/webp" ? "webp" : "jpg";
    const backExtension = backFile.type === "image/png" ? "png" : backFile.type === "image/webp" ? "webp" : "jpg";
    const base = `${user.id}/${Date.now()}`;
    const frontPath = `${base}-student-id-front.${frontExtension}`;
    const backPath = `${base}-student-id-back.${backExtension}`;

    await ensureStudentIdsBucket();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("student-ids")
      .upload(frontPath, frontBuffer, {
        contentType: frontFile.type,
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { error: backUploadError } = await supabaseAdmin.storage
      .from("student-ids")
      .upload(backPath, backBuffer, {
        contentType: backFile.type,
        upsert: false
      });

    if (backUploadError) {
      return NextResponse.json({ error: backUploadError.message }, { status: 400 });
    }

    const { error: upsertError } = await supabaseAdmin
      .from("tutor_verifications")
      .upsert(
        {
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
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
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
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("CSRF blocked") ? 403 : 401 }
    );
  }
}
