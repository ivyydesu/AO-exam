export function isVideoCallsEnabled() {
  return process.env.VIDEO_CALLS_ENABLED === "true";
}

export function isDailyProvisioningError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("missing payment method") ||
    normalized.includes("payment method") ||
    normalized.includes("billing") ||
    normalized.includes("daily api error")
  );
}

export function sanitizeVideoCallError(message: string) {
  if (!message) return "現在ビデオ通話機能は利用できません。管理者にお問い合わせください。";

  const normalized = message.toLowerCase();
  if (
    isDailyProvisioningError(message) ||
    normalized.includes("daily") ||
    normalized.includes("meeting token") ||
    normalized.includes("room") ||
    normalized.includes("permission denied") ||
    normalized.includes("camera-error") ||
    normalized.includes("notallowederror")
  ) {
    return "現在ビデオ通話機能は利用できません。時間を空けて再度お試しください。";
  }

  return message;
}
