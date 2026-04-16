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
  is_published: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  school: string | null;
  role: string;
  tutor_profiles: TutorProfileRow | TutorProfileRow[] | null;
};

function shuffle<T>(list: T[]) {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function pickTutorProfile(value: ProfileRow["tutor_profiles"]): TutorProfileRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, school, role, tutor_profiles(user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published)"
      )
      .eq("role", "tutor")
      .limit(200);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const visibleTutors = ((profiles ?? []) as ProfileRow[])
      .map((profile) => {
        const tutor = pickTutorProfile(profile.tutor_profiles);
        const tutorId = (tutor?.user_id ?? profile.id) ?? profile.id;
        return { profile, tutor, tutorId };
      })
      .filter((row) => Boolean(row.tutor) && row.tutor?.is_published === true);
    if (visibleTutors.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const tutorIds = Array.from(new Set(visibleTutors.map((row) => row.tutorId)));

    const { data: verifications } = await supabaseAdmin
      .from("tutor_verifications")
      .select("user_id, status")
      .in("user_id", tutorIds);
    const verifiedSet = new Set(
      (verifications ?? [])
        .filter((v) => v.status === "approved")
        .map((v) => v.user_id)
    );

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

      visibleTutors.forEach(({ tutorId }) => {
        const ids = requestIdsByTutor.get(tutorId) ?? [];
        const scores = ids.flatMap((id) => ratingByRequest.get(id) ?? []);
        if (scores.length === 0) {
          reviewStats.set(tutorId, { rating: 5, reviews: 0 });
        } else {
          const total = scores.reduce((sum, score) => sum + score, 0);
          reviewStats.set(tutorId, {
            rating: Number((total / scores.length).toFixed(1)),
            reviews: scores.length
          });
        }
      });
    }

    const items = shuffle(
      visibleTutors.map(({ profile, tutor, tutorId }) => {
        const stat = reviewStats.get(tutorId) ?? { rating: 5, reviews: 0 };
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
          verified: verifiedSet.has(tutorId),
          rating: stat.rating,
          reviews: stat.reviews
        };
      })
    );

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load featured tutors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
