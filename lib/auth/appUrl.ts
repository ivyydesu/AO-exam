function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getConfiguredAppUrl(): string | null {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  return envUrl ? trimTrailingSlashes(envUrl) : null;
}

export function resolveAppUrl(fallbackOrigin?: string | null): string {
  const configured = getConfiguredAppUrl();
  if (configured) return configured;

  const normalizedFallback = (fallbackOrigin ?? "").trim();
  if (normalizedFallback) return trimTrailingSlashes(normalizedFallback);

  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlashes(window.location.origin);
  }

  throw new Error("NEXT_PUBLIC_APP_URL is not configured");
}

export function getPublicAppUrl(): string {
  return resolveAppUrl();
}
