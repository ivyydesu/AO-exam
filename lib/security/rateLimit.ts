const localWindows = new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type RedisEnv = {
  url: string;
  token: string;
};

function getRedisEnv(): RedisEnv | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function consumeLocalRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const start = now - windowMs;
  const list = localWindows.get(key) ?? [];
  const alive = list.filter((ts) => ts >= start);
  if (alive.length >= limit) {
    const oldest = alive[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    localWindows.set(key, alive);
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  alive.push(now);
  localWindows.set(key, alive);
  return { allowed: true, remaining: Math.max(0, limit - alive.length), retryAfterSec: 0 };
}

async function consumeRedisRateLimit(
  env: RedisEnv,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${bucket}`;

  const response = await fetch(`${env.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(windowMs), "NX"],
      ["PTTL", redisKey]
    ]),
    cache: "no-store"
  });

  if (!response.ok) return null;
  const data = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(data) || data.length < 3) return null;
  if (data.some((item) => item?.error)) return null;

  const count = Number(data[0]?.result ?? 0);
  const ttlMsRaw = Number(data[2]?.result ?? windowMs);
  const ttlMs = Number.isFinite(ttlMsRaw) && ttlMsRaw > 0 ? ttlMsRaw : windowMs;

  if (!Number.isFinite(count) || count <= 0) return null;

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000))
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterSec: 0
  };
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisEnv();
  if (redis) {
    try {
      const redisResult = await consumeRedisRateLimit(redis, key, limit, windowMs);
      if (redisResult) return redisResult;
    } catch {
      // Fallback to local limiter if Redis is temporarily unavailable.
    }
  }
  return consumeLocalRateLimit(key, limit, windowMs);
}
