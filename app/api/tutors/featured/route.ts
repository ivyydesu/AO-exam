import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

type TutorProfileRow = {
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
  is_published: boolean;
};

type ProfileRow = {
  id: string;
  school: string | null;
  role: string;
};

function shuffle<T>(list: T[]) {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: tutorProfiles, error: tutorError } = await supabaseAdmin
      .from("tutor_profiles")
      .select("user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
      .eq("is_published", true)
      .limit(200);

    let tutorRows = (tutorProfiles ?? []) as TutorProfileRow[];
    if (tutorError) {
      const fallback = await supabaseAdmin
        .from("tutor_profiles")
        .select("user_id, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio, is_published")
        .eq("is_published", true)
        .limit(200);
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      tutorRows = (fallback.data ?? []) as TutorProfileRow[];
    }
    if (tutorRows.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const userIds = tutorRows.map((t) => t.user_id);
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, school, role")
      .in("id", userIds);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const profileMap = Object.fromEntries(
      ((profiles ?? []) as ProfileRow[])
        .filter((p) => p.role === "tutor")
        .map((p) => [p.id, p])
    );

    const visibleTutors = tutorRows.filter((row) => Boolean(profileMap[row.user_id]));
    if (visibleTutors.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: verifications } = await supabaseAdmin
      .from("tutor_verifications")
      .select("user_id, status")
      .in("user_id", visibleTutors.map((t) => t.user_id));
    const verifiedSet = new Set(
      (verifications ?? [])
        .filter((v) => v.status === "approved")
        .map((v) => v.user_id)
    );

    const { data: requests } = await supabaseAdmin
      .from("requests")
      .select("id, tutor_id")
      .in("tutor_id", visibleTutors.map((t) => t.user_id));
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

      visibleTutors.forEach((tutor) => {
        const ids = requestIdsByTutor.get(tutor.user_id) ?? [];
        const scores = ids.flatMap((id) => ratingByRequest.get(id) ?? []);
        if (scores.length === 0) {
          reviewStats.set(tutor.user_id, { rating: 5, reviews: 0 });
        } else {
          const total = scores.reduce((sum, score) => sum + score, 0);
          reviewStats.set(tutor.user_id, {
            rating: Number((total / scores.length).toFixed(1)),
            reviews: scores.length
          });
        }
      });
    }

    const items = shuffle(
      visibleTutors.map((row) => {
        const profile = profileMap[row.user_id];
        const stat = reviewStats.get(row.user_id) ?? { rating: 5, reviews: 0 };
        return {
          id: row.user_id,
          name: (row.nickname ?? "").trim() || "先輩メンター",
          school: profile.school ?? "",
          avatar: row.avatar_url ?? "",
          university: row.university,
          department: row.department,
          seminar: row.seminar,
          grade: row.grade,
          researchTheme: row.research_theme,
          coachingExperience: row.coaching_experience,
          bio: row.bio,
          verified: verifiedSet.has(row.user_id),
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
