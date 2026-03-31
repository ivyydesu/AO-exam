const DEFAULT_ALLOWED_ADMIN_EMAIL = "aokikotaru@icloud.com";

export function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function getAllowedAdminEmails() {
  const raw = process.env.ADMIN_ALLOWLIST_EMAILS ?? DEFAULT_ALLOWED_ADMIN_EMAIL;
  return raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getAllowedAdminEmails().includes(normalized);
}

export function isStrictAdmin(role?: string | null, email?: string | null) {
  return role === "admin" && isAllowedAdminEmail(email);
}
