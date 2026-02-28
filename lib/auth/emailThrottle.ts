export const EMAIL_SEND_COOLDOWN_SECONDS = 60;

function key(action: string, email: string) {
  return `ao_match_email_cooldown:${action}:${email.trim().toLowerCase()}`;
}

export function getCooldownRemaining(action: string, email: string) {
  if (typeof window === "undefined" || !email) return 0;
  const raw = window.localStorage.getItem(key(action, email));
  if (!raw) return 0;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return 0;
  const remain = Math.ceil((expiresAt - Date.now()) / 1000);
  if (remain <= 0) {
    window.localStorage.removeItem(key(action, email));
    return 0;
  }
  return remain;
}

export function startCooldown(action: string, email: string, seconds = EMAIL_SEND_COOLDOWN_SECONDS) {
  if (typeof window === "undefined" || !email) return;
  window.localStorage.setItem(key(action, email), String(Date.now() + seconds * 1000));
}

export function normalizeAuthErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("email rate limit exceeded")) {
    return "メール送信が短時間に集中しています。60秒ほど待ってから再度お試しください。";
  }
  if (lower.includes("over_email_send_rate_limit")) {
    return "メール送信の上限に達しました。少し時間を空けてから再試行してください。";
  }
  return message;
}
