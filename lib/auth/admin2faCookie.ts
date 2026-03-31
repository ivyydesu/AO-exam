import crypto from "node:crypto";

const COOKIE_NAME = "ao_admin_2fa";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function getSecret() {
  return process.env.ADMIN_2FA_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-admin-2fa-secret";
}

export function admin2faCookieName() {
  return COOKIE_NAME;
}

export function admin2faMaxAgeSeconds() {
  return MAX_AGE_SECONDS;
}

export function createAdmin2faCookieValue(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdmin2faCookieValue(raw: string | undefined | null, userId: string) {
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [uid, expRaw, sig] = parts;
  if (!uid || uid !== userId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${uid}.${expRaw}`;
  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
