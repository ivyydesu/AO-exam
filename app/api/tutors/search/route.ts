import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";

const MAX_QUERY_LEN = 120;

function clampQuery(value: string) {
  return value.slice(0, MAX_QUERY_LEN);
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function isFilled(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

type TutorRow = {
  user_id: string;
  nickname?: string | null;
  avatar_url: string | null;
  university: string;
  department: string;
  seminar: string;
  grade: string;
  research_theme: string;
  coaching_experience: string;
  bio: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  school: string | null;
  role: string;
};

function isProfileCompleted(profile: ProfileRow | undefined, tutor: TutorRow) {
  if (!profile) return false;
  const hasDisplayName = isFilled(tutor.nickname) || isFilled(profile.full_name);
  const hasSchoolInfo = isFilled(profile.school) || isFilled(tutor.university);
  return (
    hasDisplayName &&
    hasSchoolInfo &&
    isFilled(tutor.department) &&
    isFilled(tutor.grade) &&
    isFilled(tutor.research_theme) &&
    isFilled(tutor.bio)
  );
}

export async function GET(req: NextRequest) {
  try {
    const university = clampQuery(req.nextUrl.searchParams.get("university")?.trim() ?? "");
    const seminar = clampQuery(req.nextUrl.searchParams.get("seminar")?.trim() ?? "");
    const researchTheme = clampQuery(req.nextUrl.searchParams.get("researchTheme")?.trim() ?? "");
    const grade = clampQuery(req.nextUrl.searchParams.get("grade")?.trim() ?? "");
    const includeUnpublished = req.nextUrl.searchParams.get("includeUnpublished") === "1";

    const supabaseAdmin = getSupabaseAdmin();
    let canIncludeUnpublished = false;

    if (includeUnpublished) {
      try {
        const user = await requireUserFromBearerToken(req);
        const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
        canIncludeUnpublished = me?.role === "admin";
      } catch {
        canIncludeUnpublished = false;
      }
    }

    let tutors: TutorRow[] | null = null;

    const withNicknameQuery = supabaseAdmin
      .from("tutor_profiles")
      .select("user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio");
    let query = withNicknameQuery;
    if (seminar) query = query.ilike("seminar", `%${seminar}%`);
    if (researchTheme) query = query.ilike("research_theme", `%${researchTheme}%`);
    if (grade) query = query.eq("grade", grade);
    const withNickname = await query.limit(100);
    if (!withNickname.error) {
      tutors = withNickname.data;
    } else {
      let fallbackQuery = supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio");
      if (seminar) fallbackQuery = fallbackQuery.ilike("seminar", `%${seminar}%`);
      if (researchTheme) fallbackQuery = fallbackQuery.ilike("research_theme", `%${researchTheme}%`);
      if (grade) fallbackQuery = fallbackQuery.eq("grade", grade);
      const fallback = await fallbackQuery.limit(100);
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      tutors = fallback.data;
    }

    const userIds = (tutors ?? []).map((t) => t.user_id);
    let profileMap = new Map<string, ProfileRow>();
    let approvedSet = new Set<string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school, role")
        .in("id", userIds);
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }

      profileMap = new Map(
        ((profiles ?? []) as ProfileRow[])
          .filter((p) => p.role === "tutor")
          .map((p) => [p.id, p])
      );

      const { data: verifications, error: verificationError } = await supabaseAdmin
        .from("tutor_verifications")
        .select("user_id, status")
        .in("user_id", userIds);
      if (verificationError && !canIncludeUnpublished) {
        return NextResponse.json({ items: [] });
      }
      approvedSet = new Set(
        (verifications ?? [])
          .filter((v) => v.status === "approved")
          .map((v) => v.user_id)
      );
    }

    const rawItems = (tutors ?? [])
      .map((t) => {
        const profile = profileMap.get(t.user_id);
        if (!profile) return null;
        const isPublished = isProfileCompleted(profile, t) && approvedSet.has(t.user_id);
        if (!canIncludeUnpublished && !isPublished) return null;
        return {
          id: t.user_id,
          name: (t.nickname ?? "").trim() || (profile.full_name ?? "").trim() || "先輩メンター",
          school: profile.school ?? "",
          avatar: t.avatar_url ?? "",
          university: t.university,
          department: t.department,
          seminar: t.seminar,
          grade: t.grade,
          researchTheme: t.research_theme,
          coachingExperience: t.coaching_experience,
          bio: t.bio,
          isPublished
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 大学名欄は「先輩の合格校(school)」を最優先で判定し、
    // 併せて大学・学部名も拾えるように最終フィルタを実施
    const normalizedUniversity = normalizeForMatch(university);
    const normalizedSeminar = normalizeForMatch(seminar);
    const normalizedTheme = normalizeForMatch(researchTheme);
    const normalizedGrade = normalizeForMatch(grade);

    const items = rawItems.filter((item) => {
      if (normalizedUniversity) {
        const hay = normalizeForMatch(`${item.school} ${item.university} ${item.department} ${item.name}`);
        if (!hay.includes(normalizedUniversity)) return false;
      }
      if (normalizedSeminar) {
        if (!normalizeForMatch(item.seminar).includes(normalizedSeminar)) return false;
      }
      if (normalizedTheme) {
        const hay = normalizeForMatch(`${item.researchTheme} ${item.bio} ${item.coachingExperience}`);
        if (!hay.includes(normalizedTheme)) return false;
      }
      if (normalizedGrade) {
        if (!normalizeForMatch(item.grade).includes(normalizedGrade)) return false;
      }
      return true;
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
