import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

type TutorProfileRow = {
  user_id: string | null;
  nickname?: string | null;
  avatar_url: string | null;
  university: string | null;
  accepted_school?: string | null;
  department: string | null;
  seminar: string | null;
  grade: string | null;
  research_theme: string | null;
  coaching_experience: string | null;
  bio: string | null;
};

type ProfileRow = {
  id: string;
  school: string | null;
  role: string;
  tutor_profiles: TutorProfileRow | TutorProfileRow[] | null;
};

type ProfileQueryResult = {
  data: ProfileRow[] | null;
  error: { message: string } | null;
};

const MENTOR_ROLES = ["tutor", "university", "mentor", "university_student", "college_student", "大学生", "先輩"];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

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

function isMissingCreatedAtError(message: string) {
  return isMissingColumnError(message, "created_at");
}

function isInvalidRoleEnumError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("invalid input value for enum") && lower.includes("role");
}

function toProfileQueryResult(response: { data: unknown; error: { message: string } | null }): ProfileQueryResult {
  return {
    data: (response.data as ProfileRow[] | null) ?? null,
    error: response.error ? { message: response.error.message } : null
  };
}

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

    const queryWithAcceptedSchool = (useCreatedAtOrder: boolean, roles: string[]) => {
      let query = supabaseAdmin
        .from("profiles")
        .select(
          "id, school, role, tutor_profiles!inner(user_id, nickname, avatar_url, university, accepted_school, department, seminar, grade, research_theme, coaching_experience, bio)"
        )
        .in("role", roles)
        .in("id", verifiedTutorIds);
      if (useCreatedAtOrder) {
        query = query.order("created_at", { ascending: false });
      }
      return query
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
    };

    const queryWithoutAcceptedSchool = (useCreatedAtOrder: boolean, roles: string[]) => {
      let query = supabaseAdmin
        .from("profiles")
        .select(
          "id, school, role, tutor_profiles!inner(user_id, nickname, avatar_url, university, department, seminar, grade, research_theme, coaching_experience, bio)"
        )
        .in("role", roles)
        .in("id", verifiedTutorIds);
      if (useCreatedAtOrder) {
        query = query.order("created_at", { ascending: false });
      }
      return query
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
    };

    const runProfilesQuery = async (): Promise<ProfileQueryResult> => {
      const fallbackRoles = ["tutor"];
      let result = toProfileQueryResult(await queryWithAcceptedSchool(true, MENTOR_ROLES));
      if (!result.error) return result;

      if (isMissingColumnError(result.error.message, "accepted_school")) {
        result = toProfileQueryResult(await queryWithoutAcceptedSchool(true, MENTOR_ROLES));
        if (!result.error) return result;
      }

      if (result.error && isMissingCreatedAtError(result.error.message)) {
        const retryWithAccepted = toProfileQueryResult(await queryWithAcceptedSchool(false, MENTOR_ROLES));
        if (!retryWithAccepted.error) return retryWithAccepted;

        if (retryWithAccepted.error && isMissingColumnError(retryWithAccepted.error.message, "accepted_school")) {
          return toProfileQueryResult(await queryWithoutAcceptedSchool(false, MENTOR_ROLES));
        }
        return retryWithAccepted;
      }

      if (result.error && isInvalidRoleEnumError(result.error.message)) {
        const retryWithAccepted = toProfileQueryResult(await queryWithAcceptedSchool(true, fallbackRoles));
        if (!retryWithAccepted.error) return retryWithAccepted;

        if (retryWithAccepted.error && isMissingColumnError(retryWithAccepted.error.message, "accepted_school")) {
          return toProfileQueryResult(await queryWithoutAcceptedSchool(true, fallbackRoles));
        }

        if (retryWithAccepted.error && isMissingCreatedAtError(retryWithAccepted.error.message)) {
          const retryWithoutCreatedAt = toProfileQueryResult(await queryWithAcceptedSchool(false, fallbackRoles));
          if (!retryWithoutCreatedAt.error) return retryWithoutCreatedAt;
          if (
            retryWithoutCreatedAt.error &&
            isMissingColumnError(retryWithoutCreatedAt.error.message, "accepted_school")
          ) {
            return toProfileQueryResult(await queryWithoutAcceptedSchool(false, fallbackRoles));
          }
          return retryWithoutCreatedAt;
        }

        return retryWithAccepted;
      }

      return result;
    };

    let profiles: ProfileRow[] | null = null;
    let profileError: { message: string } | null = null;

    const queryResult = await runProfilesQuery();
    profiles = queryResult.data ?? null;
    profileError = queryResult.error;

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
      const university = tutor?.university ?? "";
      const department = tutor?.department ?? "";
      const seminar = tutor?.seminar ?? "";
      const grade = tutor?.grade ?? "";
      const acceptedSchool = (tutor?.accepted_school ?? profile.school ?? "").trim();
      const researchTheme = tutor?.research_theme ?? "";
      const coachingExperience = tutor?.coaching_experience ?? "";
      const bio = tutor?.bio ?? "";
      return {
        id: tutorId,
        name: nickname || "匿名ユーザー",
        nickname,
        school: acceptedSchool,
        accepted_school: acceptedSchool,
        avatar: tutor?.avatar_url ?? "",
        tutor_profiles: {
          university,
          accepted_school: acceptedSchool,
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
