import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const tutorId = params.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, school, role")
      .eq("id", tutorId)
      .maybeSingle();
    if (!profile || profile.role !== "tutor") {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    const withPublish = await supabaseAdmin
      .from("tutor_profiles")
      .select("avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
      .eq("user_id", tutorId)
      .maybeSingle();

    let tutor = withPublish.data as
      | {
          avatar_url: string | null;
          university: string;
          department: string;
          seminar: string;
          grade: string;
          research_theme: string;
          coaching_experience: string;
          bio: string;
          is_published?: boolean;
        }
      | null;

    if (withPublish.error) {
      const fallback = await supabaseAdmin
        .from("tutor_profiles")
        .select("avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio")
        .eq("user_id", tutorId)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      tutor = fallback.data as typeof tutor;
    }

    if (!tutor) return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });

    return NextResponse.json({
      item: {
        id: tutorId,
        name: profile.full_name,
        school: profile.school ?? "",
        avatar: tutor.avatar_url ?? "",
        university: tutor.university ?? "",
        department: tutor.department ?? "",
        seminar: tutor.seminar ?? "",
        grade: tutor.grade ?? "",
        researchTheme: tutor.research_theme ?? "",
        coachingExperience: tutor.coaching_experience ?? "",
        bio: tutor.bio ?? "",
        isPublished: tutor.is_published ?? true
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tutor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
