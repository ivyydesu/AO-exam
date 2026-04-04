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

    let tutors:
      | Array<{
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
          is_published?: boolean;
        }>
      | null = null;

    const withPublishQuery = supabaseAdmin
      .from("tutor_profiles")
      .select("user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published");
    let query = withPublishQuery;
    if (!canIncludeUnpublished) query = query.eq("is_published", true);
    if (seminar) query = query.ilike("seminar", `%${seminar}%`);
    if (researchTheme) query = query.ilike("research_theme", `%${researchTheme}%`);
    if (grade) query = query.eq("grade", grade);
    const withPublish = await query.limit(100);
    if (!withPublish.error) {
      tutors = withPublish.data;
    } else {
      // fallback-1: nickname列が未反映でも公開判定は維持する
      let fallbackPublicQuery = supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published");
      if (!canIncludeUnpublished) fallbackPublicQuery = fallbackPublicQuery.eq("is_published", true);
      if (seminar) fallbackPublicQuery = fallbackPublicQuery.ilike("seminar", `%${seminar}%`);
      if (researchTheme) fallbackPublicQuery = fallbackPublicQuery.ilike("research_theme", `%${researchTheme}%`);
      if (grade) fallbackPublicQuery = fallbackPublicQuery.eq("grade", grade);
      const fallbackPublic = await fallbackPublicQuery.limit(100);
      if (!fallbackPublic.error) {
        tutors = fallbackPublic.data;
      } else if (!canIncludeUnpublished) {
        // 公開状態の判定ができない時は、漏えい防止のため空配列を返す
        return NextResponse.json({ items: [] });
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
    }

    const userIds = (tutors ?? []).map((t) => t.user_id);
    let names: Record<string, { full_name: string; school: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school, role")
        .in("id", userIds);
      names = Object.fromEntries(
        (profiles ?? [])
          .filter((p) => p.role === "tutor")
          .map((p) => [p.id, { full_name: p.full_name, school: p.school }])
      );
    }

    const rawItems = (tutors ?? [])
      .filter((t) => Boolean(names[t.user_id]))
      .map((t) => ({
        id: t.user_id,
        name: (t.nickname ?? "").trim() || names[t.user_id].full_name,
        school: names[t.user_id].school ?? "",
        avatar: t.avatar_url ?? "",
        university: t.university,
        department: t.department,
        seminar: t.seminar,
        grade: t.grade,
        researchTheme: t.research_theme,
        coachingExperience: t.coaching_experience,
        bio: t.bio,
        isPublished: t.is_published === true
      }));

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
