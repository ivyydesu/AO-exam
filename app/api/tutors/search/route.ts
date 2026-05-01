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

function isMissingColumnError(message: string, column: string) {
  return (
    message.includes(`column "${column}"`) ||
    message.includes(`column ${column}`) ||
    message.includes(`'${column}'`) ||
    message.includes(`.${column}`) ||
    message.includes(`"${column} does not exist"`) ||
    message.includes(`${column} does not exist`)
  );
}

type TutorRow = {
  user_id: string;
  nickname?: string | null;
  avatar_url: string | null;
  university: string;
  accepted_school?: string | null;
  department: string;
  seminar: string;
  grade: string;
  research_theme: string;
  coaching_experience: string;
  bio: string;
};

type ProfileRow = {
  id: string;
  school: string | null;
  role: string;
};

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

    const withNicknameQueryWithAcceptedSchool = () =>
      supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, nickname, avatar_url, university, accepted_school, department, seminar, grade, research_theme, coaching_experience, bio");
    const withNicknameQueryWithoutAcceptedSchool = () =>
      supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio");

    let withNicknameBuilder = withNicknameQueryWithAcceptedSchool();
    if (seminar) withNicknameBuilder = withNicknameBuilder.ilike("seminar", `%${seminar}%`);
    if (researchTheme) withNicknameBuilder = withNicknameBuilder.ilike("research_theme", `%${researchTheme}%`);
    if (grade) withNicknameBuilder = withNicknameBuilder.eq("grade", grade);
    let withNickname: any = await withNicknameBuilder.limit(100);
    if (withNickname.error && isMissingColumnError(withNickname.error.message, "accepted_school")) {
      let withoutAcceptedBuilder = withNicknameQueryWithoutAcceptedSchool();
      if (seminar) withoutAcceptedBuilder = withoutAcceptedBuilder.ilike("seminar", `%${seminar}%`);
      if (researchTheme) withoutAcceptedBuilder = withoutAcceptedBuilder.ilike("research_theme", `%${researchTheme}%`);
      if (grade) withoutAcceptedBuilder = withoutAcceptedBuilder.eq("grade", grade);
      withNickname = await withoutAcceptedBuilder.limit(100);
    }
    if (!withNickname.error) {
      tutors = (withNickname.data as TutorRow[] | null) ?? null;
    } else {
      let fallbackQuery = supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, avatar_url, university, accepted_school, department, seminar, grade, research_theme, coaching_experience, bio");
      if (seminar) fallbackQuery = fallbackQuery.ilike("seminar", `%${seminar}%`);
      if (researchTheme) fallbackQuery = fallbackQuery.ilike("research_theme", `%${researchTheme}%`);
      if (grade) fallbackQuery = fallbackQuery.eq("grade", grade);
      let fallback: any = await fallbackQuery.limit(100);
      if (fallback.error && isMissingColumnError(fallback.error.message, "accepted_school")) {
        let legacyFallbackQuery = supabaseAdmin
          .from("tutor_profiles")
          .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio");
        if (seminar) legacyFallbackQuery = legacyFallbackQuery.ilike("seminar", `%${seminar}%`);
        if (researchTheme) legacyFallbackQuery = legacyFallbackQuery.ilike("research_theme", `%${researchTheme}%`);
        if (grade) legacyFallbackQuery = legacyFallbackQuery.eq("grade", grade);
        fallback = await legacyFallbackQuery.limit(100);
      }
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      tutors = (fallback.data as TutorRow[] | null) ?? null;
    }

    const userIds = (tutors ?? []).map((t) => t.user_id);
    let profileMap = new Map<string, ProfileRow>();
    let approvedSet = new Set<string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, school, role")
        .in("id", userIds);
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }

      profileMap = new Map(
        ((profiles ?? []) as ProfileRow[])
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
        const isPublished = approvedSet.has(t.user_id);
        if (!canIncludeUnpublished && !isPublished) return null;
        const acceptedSchool = (t.accepted_school ?? profile.school ?? "").trim();
        return {
          id: t.user_id,
          name: (t.nickname ?? "").trim() || "匿名ユーザー",
          school: acceptedSchool,
          accepted_school: acceptedSchool,
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
