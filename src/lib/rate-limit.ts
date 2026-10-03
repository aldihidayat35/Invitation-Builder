/**
 * Small in-memory fixed-window rate limiter for public endpoints. Per-process
 * only (documented limitation: a shared store is needed for multi-instance
 * deployments - tracked for F11/F12).
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export function createRateLimiter(options: {
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: () => number;
  readonly maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 10_000;
  const buckets = new Map<string, { start: number; count: number }>();

  return {
    check(key) {
      const t = now();
      if (buckets.size > maxKeys) {
        for (const [k, b] of buckets) if (t - b.start >= windowMs) buckets.delete(k);
        if (buckets.size > maxKeys) buckets.clear();
      }
      const bucket = buckets.get(key);
      if (!bucket || t - bucket.start >= windowMs) {
        buckets.set(key, { start: t, count: 1 });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      bucket.count += 1;
      if (bucket.count > limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((bucket.start + windowMs - t) / 1000)),
        };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
