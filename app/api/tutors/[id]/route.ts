import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { requireUserFromBearerToken } from "../../../../lib/auth/requireUser";

const UUID_V4_OR_V1 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MENTOR_ROLES = new Set(["tutor", "university", "mentor", "university_student", "college_student", "大学生", "先輩"]);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const tutorId = params.id;
    if (!UUID_V4_OR_V1.test(tutorId)) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }
    let requesterId: string | null = null;
    let requesterRole: "student" | "tutor" | "university" | "admin" | null = null;

    try {
      const authed = await requireUserFromBearerToken(_req);
      requesterId = authed.id;
      const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", authed.id).maybeSingle();
      requesterRole = (me?.role as "student" | "tutor" | "university" | "admin" | null) ?? null;
    } catch {
      requesterId = null;
      requesterRole = null;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, school, role")
      .eq("id", tutorId)
      .maybeSingle();
    if (!profile || !MENTOR_ROLES.has(String(profile.role))) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    const withPublish = await supabaseAdmin
      .from("tutor_profiles")
      .select("nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
      .eq("user_id", tutorId)
      .maybeSingle();

    let tutor = withPublish.data as
      | {
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
        }
      | null;

    if (withPublish.error) {
      const fallback = await supabaseAdmin
        .from("tutor_profiles")
        .select("avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
        .eq("user_id", tutorId)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      tutor = fallback.data as typeof tutor;
    }

    if (!tutor) return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
    const { data: verification } = await supabaseAdmin
      .from("tutor_verifications")
      .select("status")
      .eq("user_id", tutorId)
      .maybeSingle();
    const isVerified = verification?.status === "approved";

    let rating = 0;
    let reviews = 0;
    const { data: requestRows } = await supabaseAdmin
      .from("requests")
      .select("id")
      .eq("tutor_id", tutorId);
    const requestIds = (requestRows ?? []).map((row) => row.id);
    if (requestIds.length > 0) {
      const { data: reviewRows } = await supabaseAdmin
        .from("reviews")
        .select("rating")
        .in("request_id", requestIds);
      const scores = (reviewRows ?? [])
        .map((row) => Number(row.rating ?? 0))
        .filter((score) => Number.isFinite(score) && score > 0);
      reviews = scores.length;
      if (reviews > 0) {
        const total = scores.reduce((sum, score) => sum + score, 0);
        rating = Number((total / reviews).toFixed(1));
      }
    }

    const isPublished = isVerified;
    const canViewUnpublished = requesterRole === "admin" || requesterId === tutorId;
    if (!isPublished && !canViewUnpublished) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        id: tutorId,
        name: (tutor.nickname ?? "").trim() || (profile.full_name ?? "").trim() || "先輩メンター",
        school: profile.school ?? "",
        avatar: tutor.avatar_url ?? "",
        university: (tutor.university?.trim() || profile.school) ?? "",
        department: tutor.department ?? "",
        seminar: tutor.seminar ?? "",
        grade: tutor.grade ?? "",
        researchTheme: tutor.research_theme ?? "",
        coachingExperience: tutor.coaching_experience ?? "",
        bio: tutor.bio ?? "",
        rating,
        reviews,
        isPublished,
        verified: isVerified
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tutor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
