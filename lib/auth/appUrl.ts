export function getPublicAppUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  const envUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  return "http://localhost:3000";
}
