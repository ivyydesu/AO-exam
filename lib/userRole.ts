export type UserRole = "student" | "tutor" | "admin";

export function normalizeUserRole(raw: unknown, fallback: UserRole = "student"): UserRole {
  const normalized = String(raw ?? "").trim();
  const role = normalized.toLowerCase();

  const adminRoles = new Set(["admin", "administrator", "運営", "管理者"]);
  if (adminRoles.has(role) || adminRoles.has(normalized)) return "admin";

  const tutorRoles = new Set([
    "tutor",
    "mentor",
    "university",
    "university_student",
    "college_student",
    "大学生",
    "先輩"
  ]);
  if (tutorRoles.has(role) || tutorRoles.has(normalized)) return "tutor";

  const studentRoles = new Set(["student", "highschool", "high_school", "高校生"]);
  if (studentRoles.has(role) || studentRoles.has(normalized)) return "student";

  if (
    role.includes("tutor") ||
    role.includes("mentor") ||
    role.includes("university") ||
    normalized.includes("大学")
  ) {
    return "tutor";
  }

  if (role.includes("admin") || normalized.includes("運営") || normalized.includes("管理")) {
    return "admin";
  }

  return fallback;
}

