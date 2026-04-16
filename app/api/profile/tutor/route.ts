import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { sanitizePlainText } from "../../../../lib/security/input";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const OPTIONAL_TUTOR_COLUMNS = ["is_published", "is_public", "cover_url", "nickname"] as const;

type TutorProfileRow = {
  nickname?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  university?: string;
  department?: string;
  seminar?: string;
  grade?: string;
  research_theme?: string;
  coaching_experience?: string;
  bio?: string;
  is_published?: boolean;
  is_public?: boolean;
};

const TUTOR_SELECT_BASE = "nickname, avatar_url, cover_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published, is_public";

function isMissingColumnError(message: string, column: string) {
  return message.includes(`column "${column}"`) || message.includes(`column ${column}`) || message.includes(`'${column}'`);
}

function buildTutorSelect(excluded: Set<string>) {
  return TUTOR_SELECT_BASE.split(",")
    .map((part) => part.trim())
    .filter((column) => !excluded.has(column))
    .join(", ");
}

async function fetchTutorProfileRow(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const excluded = new Set<string>();
  let lastError: string | null = null;

  for (let i = 0; i < OPTIONAL_TUTOR_COLUMNS.length + 2; i += 1) {
    const select = buildTutorSelect(excluded);
    const { data, error } = await supabaseAdmin
      .from("tutor_profiles")
      .select(select)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error) {
      return { data: (data as TutorProfileRow | null) ?? null, missingColumns: excluded };
    }

    lastError = error.message;
    const missing = OPTIONAL_TUTOR_COLUMNS.find((column) => !excluded.has(column) && isMissingColumnError(error.message, column));
    if (missing) {
      excluded.add(missing);
      continue;
    }
    break;
  }

  throw new Error(lastError ?? "tutor profile fetch failed");
}

async function ensureAvatarBucket() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets ?? []).some((b) => b.id === "avatars");
  if (exists) return;
  await supabaseAdmin.storage.createBucket("avatars", { public: true });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, school")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const tutorResult = await fetchTutorProfileRow(user.id);
    const tutor = tutorResult.data;

    return NextResponse.json(
      {
        profile: {
          full_name: profile.full_name ?? "",
          nickname: tutor?.nickname ?? "",
          role: profile.role,
          school: profile.school ?? "",
          avatar_url: tutor?.avatar_url ?? "",
          cover_url: tutor?.cover_url ?? "",
          university: tutor?.university ?? "",
          department: tutor?.department ?? "",
          seminar: tutor?.seminar ?? "",
          grade: tutor?.grade ?? "",
          research_theme: tutor?.research_theme ?? "",
          coaching_experience: tutor?.coaching_experience ?? "",
          bio: tutor?.bio ?? "",
          is_published: tutor?.is_published ?? tutor?.is_public ?? false
        }
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedOrigin(req);
    const user = await requireUserFromBearerToken(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: roleRow } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const mentorRoles = new Set(["tutor", "university"]);
    if (!roleRow || !mentorRoles.has(String(roleRow.role))) {
      return NextResponse.json({ error: "Only tutor can edit tutor profile" }, { status: 403 });
    }

    const form = await req.formData();
    const fullName = sanitizePlainText(String(form.get("full_name") ?? ""), 80);
    const nickname = sanitizePlainText(String(form.get("nickname") ?? ""), 40);
    const school = sanitizePlainText(String(form.get("school") ?? ""), 120);
    const universityInput = sanitizePlainText(String(form.get("university") ?? ""), 120);
    const university = universityInput || school;
    const department = sanitizePlainText(String(form.get("department") ?? ""), 120);
    const seminar = sanitizePlainText(String(form.get("seminar") ?? ""), 120);
    const grade = sanitizePlainText(String(form.get("grade") ?? ""), 20);
    const researchTheme = sanitizePlainText(String(form.get("research_theme") ?? ""), 400);
    const coachingExperience = sanitizePlainText(String(form.get("coaching_experience") ?? ""), 800);
    const bio = sanitizePlainText(String(form.get("bio") ?? ""), 1200);
    const avatarFile = form.get("avatar");
    const coverFile = form.get("cover");
    const isPublishedRaw = form.get("is_published");

    let avatarUrl: string | null = null;
    let coverUrl: string | null = null;
    if (avatarFile instanceof File && avatarFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(avatarFile.type)) {
        return NextResponse.json({ error: "avatar は jpeg/png/webp のみ対応です" }, { status: 400 });
      }
      if (avatarFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "avatar は 5MB 以下にしてください" }, { status: 400 });
      }
      await ensureAvatarBucket();
      const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${Date.now()}-avatar.${ext}`;
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(path, buffer, { contentType: avatarFile.type || "image/jpeg", upsert: true });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }
      const { data: publicData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
      avatarUrl = publicData.publicUrl;
    }
    if (coverFile instanceof File && coverFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(coverFile.type)) {
        return NextResponse.json({ error: "cover は jpeg/png/webp のみ対応です" }, { status: 400 });
      }
      if (coverFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "cover は 5MB 以下にしてください" }, { status: 400 });
      }
      await ensureAvatarBucket();
      const ext = coverFile.type === "image/png" ? "png" : coverFile.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${Date.now()}-cover.${ext}`;
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(path, buffer, { contentType: coverFile.type || "image/jpeg", upsert: true });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }
      const { data: publicData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
      coverUrl = publicData.publicUrl;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: fullName, school })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      nickname,
      university,
      department,
      seminar,
      grade,
      research_theme: researchTheme,
      coaching_experience: coachingExperience,
      bio,
      updated_at: new Date().toISOString()
    };
    if (isPublishedRaw !== null) {
      payload.is_published = isPublishedRaw === "true";
    }
    const resolvedIsPublished = isPublishedRaw !== null ? isPublishedRaw === "true" : undefined;
    if (avatarUrl) payload.avatar_url = avatarUrl;
    if (coverUrl) payload.cover_url = coverUrl;

    let payloadForUpsert = { ...payload };
    let tutorError: { message: string } | null = null;

    for (let i = 0; i < OPTIONAL_TUTOR_COLUMNS.length + 2; i += 1) {
      const result = await supabaseAdmin
        .from("tutor_profiles")
        .upsert(payloadForUpsert, { onConflict: "user_id" });
      if (!result.error) {
        tutorError = null;
        break;
      }

      tutorError = result.error;
      const missing = OPTIONAL_TUTOR_COLUMNS.find((column) => column in payloadForUpsert && isMissingColumnError(result.error.message, column));
      if (missing) {
        delete payloadForUpsert[missing];
        continue;
      }
      break;
    }

    if (tutorError) {
      return NextResponse.json({ error: tutorError.message }, { status: 400 });
    }

    const tutorResult = await fetchTutorProfileRow(user.id);
    const latestProfile = tutorResult.data;

    return NextResponse.json({
      ok: true,
      profile: {
        full_name: fullName,
        nickname: latestProfile?.nickname ?? nickname,
        school,
        university: latestProfile?.university ?? university,
        department: latestProfile?.department ?? department,
        seminar: latestProfile?.seminar ?? seminar,
        grade: latestProfile?.grade ?? grade,
        research_theme: latestProfile?.research_theme ?? researchTheme,
        coaching_experience: latestProfile?.coaching_experience ?? coachingExperience,
        bio: latestProfile?.bio ?? bio,
        is_published: latestProfile?.is_published ?? resolvedIsPublished ?? false,
        avatar_url: latestProfile?.avatar_url ?? avatarUrl,
        cover_url: latestProfile?.cover_url ?? coverUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save tutor profile";
    const status = message.includes("CSRF blocked") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
