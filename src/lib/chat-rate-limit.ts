/**
 * Best-effort in-memory rate limiter for /api/chat.
 *
 * LIMITATION: on serverless/edge hosting (Netlify Functions) each warm
 * instance has its own memory and instances are recycled, so these counters
 * are per-instance and reset on cold start. This slows down a single abusive
 * client hitting a warm instance but is NOT a global quota. A durable limiter
 * (Supabase counter RPC, Upstash, or Netlify rate-limit rules) should back
 * this before launch.
 */

export interface RateLimitRule {
  /** Max requests allowed within the window. */
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the oldest request in the window expires (when blocked). */
  retryAfterSec: number
}

export const GUEST_CHAT_RATE_LIMITS: RateLimitRule[] = [
  { limit: 6, windowMs: 60_000 },
  { limit: 30, windowMs: 60 * 60_000 },
]

export const USER_CHAT_RATE_LIMITS: RateLimitRule[] = [
  { limit: 15, windowMs: 60_000 },
  { limit: 150, windowMs: 60 * 60_000 },
]

/** Per-IP ceiling applied to signed-in traffic too (shared NAT tolerant). */
export const IP_CHAT_RATE_LIMITS: RateLimitRule[] = [
  { limit: 30, windowMs: 60_000 },
  { limit: 300, windowMs: 60 * 60_000 },
]

const MAX_KEYS = 10_000

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>()

  constructor(private readonly now: () => number = Date.now) {}

  /** Records a hit for `key` if every rule allows it. */
  check(key: string, rules: RateLimitRule[]): RateLimitResult {
    const now = this.now()
    const longest = Math.max(...rules.map(r => r.windowMs))
    const timestamps = (this.hits.get(key) ?? []).filter(t => now - t < longest)

    let retryAfterMs = 0
    for (const rule of rules) {
      const inWindow = timestamps.filter(t => now - t < rule.windowMs)
      if (inWindow.length >= rule.limit) {
        retryAfterMs = Math.max(retryAfterMs, rule.windowMs - (now - inWindow[0]))
      }
    }

    if (retryAfterMs > 0) {
      this.hits.set(key, timestamps)
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
    }

    timestamps.push(now)
    this.hits.delete(key) // re-insert to keep Map order ~LRU
    this.hits.set(key, timestamps)
    if (this.hits.size > MAX_KEYS) {
      const oldest = this.hits.keys().next().value
      if (oldest !== undefined) this.hits.delete(oldest)
    }
    return { allowed: true, retryAfterSec: 0 }
  }
}

/** Client IP from proxy headers (Netlify sets x-nf-client-connection-ip). */
export function clientIpFromHeaders(headers: Headers): string {
  const direct = headers.get('x-nf-client-connection-ip') ?? headers.get('x-real-ip')
  if (direct) return direct.trim()
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

export const chatRateLimiter = new SlidingWindowRateLimiter()
