// In-memory rate limiter (legacy, per-instance) and Postgres-backed
// persistent variant for security-critical flows that must survive Vercel
// cold starts (notably the founder magic-link OTP request flow).

import { createAdminClient } from '@/lib/supabase/server'

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * In-memory rate limit. Acceptable for non-security-critical flows where
 * honeypot + spam scoring is the real defense (inquiries, newsletter, etc).
 * Resets on every serverless cold start, so do NOT use for OTP / auth flows.
 */
export function rateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000 // 1 minute
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Clean up expired records periodically
  if (rateLimitMap.size > 10000) {
    const keys = Array.from(rateLimitMap.keys())
    for (const key of keys) {
      const value = rateLimitMap.get(key)
      if (value && now > value.resetAt) {
        rateLimitMap.delete(key)
      }
    }
  }

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return { success: true, remaining: limit - record.count, resetAt: record.resetAt }
}

/**
 * Persistent rate limit backed by the `rate_limit_events` table. Survives
 * Vercel cold starts. Use for security-critical flows — magic-link OTP
 * requests, password reset, anything where an attacker can blow past the
 * in-memory limiter by spraying requests across cold instances.
 *
 * Counts events in (bucket, identifier) within the rolling windowMs.
 * On allow, inserts a new event row. Returns the same shape as rateLimit().
 *
 * Async — callers must await. Uses the service-role client (the table has
 * no client RLS policies).
 */
export async function rateLimitPersistent(
  bucket: string,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = new Date(now - windowMs).toISOString()
  const resetAt = now + windowMs

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { count, error: countError } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .eq('identifier', identifier)
    .gte('created_at', windowStart)

  if (countError) {
    // Fail open with a warning: a DB outage shouldn't lock everyone out.
    // Treat as allowed but don't record the event.
    console.error('rateLimitPersistent count failed; allowing request:', countError)
    return { success: true, remaining: limit - 1, resetAt }
  }

  const current = typeof count === 'number' ? count : 0
  if (current >= limit) {
    return { success: false, remaining: 0, resetAt }
  }

  const { error: insertError } = await supabase
    .from('rate_limit_events')
    .insert({ bucket, identifier })

  if (insertError) {
    console.error('rateLimitPersistent insert failed:', insertError)
    // Still allow this request — the count check passed.
  }

  return { success: true, remaining: limit - current - 1, resetAt }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
