// In-memory rate limiter
// Note: For production, replace with Redis/Upstash for persistence across serverless instances

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

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
