import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";
import { sanitizePlainText } from "../../../../lib/security/input";
import { assertTrustedOrigin } from "../../../../lib/security/csrf";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

    let tutor: {
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
    } | null = null;

    const withPublish = await supabaseAdmin
      .from("tutor_profiles")
      .select("nickname, avatar_url, cover_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!withPublish.error) {
      tutor = withPublish.data;
    } else {
      const fallback = await supabaseAdmin
        .from("tutor_profiles")
        .select("avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      tutor = fallback.data ? { ...fallback.data, nickname: "" } : null;
    }

    return NextResponse.json({
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
        is_published: tutor?.is_published ?? false
      }
    });
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

    if (!roleRow || roleRow.role !== "tutor") {
      return NextResponse.json({ error: "Only tutor can edit tutor profile" }, { status: 403 });
    }

    const form = await req.formData();
    const fullName = sanitizePlainText(String(form.get("full_name") ?? ""), 80);
    const nickname = sanitizePlainText(String(form.get("nickname") ?? ""), 40);
    const school = sanitizePlainText(String(form.get("school") ?? ""), 120);
    const university = sanitizePlainText(String(form.get("university") ?? ""), 120);
    const department = sanitizePlainText(String(form.get("department") ?? ""), 120);
    const seminar = sanitizePlainText(String(form.get("seminar") ?? ""), 120);
    const grade = sanitizePlainText(String(form.get("grade") ?? ""), 20);
    const researchTheme = sanitizePlainText(String(form.get("research_theme") ?? ""), 400);
    const coachingExperience = sanitizePlainText(String(form.get("coaching_experience") ?? ""), 800);
    const bio = sanitizePlainText(String(form.get("bio") ?? ""), 1200);
    const avatarFile = form.get("avatar");
    const coverFile = form.get("cover");

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
      is_published: form.get("is_published") === "true",
      updated_at: new Date().toISOString()
    };
    if (avatarUrl) payload.avatar_url = avatarUrl;
    if (coverUrl) payload.cover_url = coverUrl;

    let { error: tutorError } = await supabaseAdmin
      .from("tutor_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (tutorError) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.is_published;
      delete fallbackPayload.cover_url;
      delete fallbackPayload.nickname;
      const fallback = await supabaseAdmin
        .from("tutor_profiles")
        .upsert(fallbackPayload, { onConflict: "user_id" });
      tutorError = fallback.error;
    }

    if (tutorError) {
      return NextResponse.json({ error: tutorError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        full_name: fullName,
        nickname,
        school,
        university,
        department,
        seminar,
        grade,
        research_theme: researchTheme,
        coaching_experience: coachingExperience,
        bio,
        is_published: form.get("is_published") === "true",
        avatar_url: avatarUrl,
        cover_url: coverUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save tutor profile";
    const status = message.includes("CSRF blocked") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
