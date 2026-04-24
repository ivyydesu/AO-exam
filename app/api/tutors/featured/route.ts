import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

type TutorProfileRow = {
  user_id: string | null;
  nickname?: string | null;
  avatar_url: string | null;
  university: string | null;
  department: string | null;
  seminar: string | null;
  grade: string | null;
  research_theme: string | null;
  coaching_experience: string | null;
  bio: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  school: string | null;
  role: string;
  tutor_profiles: TutorProfileRow | TutorProfileRow[] | null;
};

const MENTOR_ROLES = ["tutor", "university", "mentor", "university_student", "college_student", "大学生", "先輩"];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

function pickTutorProfile(value: ProfileRow["tutor_profiles"]): TutorProfileRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function toSafeInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  if (normalized < min) return min;
  if (normalized > max) return max;
  return normalized;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = toSafeInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = toSafeInt(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: verifications, error: verificationError } = await supabaseAdmin
      .from("tutor_verifications")
      .select("user_id")
      .eq("status", "approved");

    if (verificationError) {
      return NextResponse.json({ error: verificationError.message }, { status: 400 });
    }

    const verifiedTutorIds = Array.from(new Set((verifications ?? []).map((row) => row.user_id).filter(Boolean)));
    if (verifiedTutorIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, school, role, tutor_profiles!inner(user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio)"
      )
      .in("role", MENTOR_ROLES)
      .in("id", verifiedTutorIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const tutorCandidates = ((profiles ?? []) as ProfileRow[])
      .map((profile) => {
        const tutor = pickTutorProfile(profile.tutor_profiles);
        const tutorId = (tutor?.user_id ?? profile.id) ?? profile.id;
        return { profile, tutor, tutorId };
      });
    if (tutorCandidates.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const tutorIds = Array.from(new Set(tutorCandidates.map((row) => row.tutorId)));

    const { data: requests } = await supabaseAdmin
      .from("requests")
      .select("id, tutor_id")
      .in("tutor_id", tutorIds);
    const requestIdsByTutor = new Map<string, string[]>();
    (requests ?? []).forEach((row) => {
      const bucket = requestIdsByTutor.get(row.tutor_id) ?? [];
      bucket.push(row.id);
      requestIdsByTutor.set(row.tutor_id, bucket);
    });

    const allRequestIds = (requests ?? []).map((r) => r.id);
    const reviewStats = new Map<string, { rating: number; reviews: number }>();
    if (allRequestIds.length > 0) {
      const { data: reviews } = await supabaseAdmin
        .from("reviews")
        .select("request_id, rating")
        .in("request_id", allRequestIds);

      const ratingByRequest = new Map<string, number[]>();
      (reviews ?? []).forEach((r) => {
        const bucket = ratingByRequest.get(r.request_id) ?? [];
        bucket.push(Number(r.rating ?? 0));
        ratingByRequest.set(r.request_id, bucket);
      });

      tutorCandidates.forEach(({ tutorId }) => {
        const ids = requestIdsByTutor.get(tutorId) ?? [];
        const scores = ids.flatMap((id) => ratingByRequest.get(id) ?? []);
        if (scores.length === 0) {
          reviewStats.set(tutorId, { rating: 0, reviews: 0 });
        } else {
          const total = scores.reduce((sum, score) => sum + score, 0);
          reviewStats.set(tutorId, {
            rating: Number((total / scores.length).toFixed(1)),
            reviews: scores.length
          });
        }
      });
    }

    const items = tutorCandidates.map(({ profile, tutor, tutorId }) => {
      const stat = reviewStats.get(tutorId) ?? { rating: 0, reviews: 0 };
      const nickname = (tutor?.nickname ?? "").trim();
      const fullName = (profile.full_name ?? "").trim();
      const university = tutor?.university ?? "";
      const department = tutor?.department ?? "";
      const seminar = tutor?.seminar ?? "";
      const grade = tutor?.grade ?? "";
      const researchTheme = tutor?.research_theme ?? "";
      const coachingExperience = tutor?.coaching_experience ?? "";
      const bio = tutor?.bio ?? "";
      return {
        id: tutorId,
        name: nickname || fullName || "先輩メンター",
        nickname,
        full_name: fullName,
        school: profile.school ?? "",
        avatar: tutor?.avatar_url ?? "",
        tutor_profiles: {
          university,
          department,
          seminar,
          grade,
          research_theme: researchTheme,
          coaching_experience: coachingExperience,
          bio
        },
        university,
        department,
        seminar,
        grade,
        researchTheme,
        coachingExperience,
        bio,
        verified: true,
        rating: stat.rating,
        reviews: stat.reviews
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load featured tutors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
