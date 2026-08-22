/**
 * Small in-memory limiter for auth endpoints. Good enough for a single node;
 * swap for Redis/Upstash when the app runs on more than one instance.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  }
}

export function resetRateLimits(): void {
  buckets.clear()
}
