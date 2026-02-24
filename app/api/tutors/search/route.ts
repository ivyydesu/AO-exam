import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const university = req.nextUrl.searchParams.get("university")?.trim() ?? "";
    const seminar = req.nextUrl.searchParams.get("seminar")?.trim() ?? "";
    const researchTheme = req.nextUrl.searchParams.get("researchTheme")?.trim() ?? "";
    const grade = req.nextUrl.searchParams.get("grade")?.trim() ?? "";
    const includeUnpublished = req.nextUrl.searchParams.get("includeUnpublished") === "1";

    const supabaseAdmin = getSupabaseAdmin();

    let tutors:
      | Array<{
          user_id: string;
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
      .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published");
    let query = withPublishQuery;
    if (!includeUnpublished) query = query.eq("is_published", true);
    if (university) query = query.ilike("university", `%${university}%`);
    if (seminar) query = query.ilike("seminar", `%${seminar}%`);
    if (researchTheme) query = query.ilike("research_theme", `%${researchTheme}%`);
    if (grade) query = query.eq("grade", grade);
    const withPublish = await query.limit(100);
    if (!withPublish.error) {
      tutors = withPublish.data;
    } else {
      let fallbackQuery = supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio");
      if (university) fallbackQuery = fallbackQuery.ilike("university", `%${university}%`);
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

    const items = (tutors ?? [])
      .filter((t) => Boolean(names[t.user_id]))
      .map((t) => ({
        id: t.user_id,
        name: names[t.user_id].full_name,
        school: names[t.user_id].school ?? "",
        avatar: t.avatar_url ?? "",
        university: t.university,
        department: t.department,
        seminar: t.seminar,
        grade: t.grade,
        researchTheme: t.research_theme,
        coachingExperience: t.coaching_experience,
        bio: t.bio,
        isPublished: t.is_published ?? true
      }));

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
