import type { SupabaseClient } from '@supabase/supabase-js'

export interface ScoreInput {
  name: string
  email: string
  subject?: string | null
  message: string
}

export interface ScoreMeta {
  renderedAt?: number
  now: number
  supabase: SupabaseClient
}

export interface ScoreResult {
  score: number
  reasons: string[]
}

const DISPOSABLE_DOMAINS = new Set([
  'mackspw.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  '10minutemail.com',
  'trashmail.com',
  'yopmail.com',
  'getnada.com',
  'dispostable.com',
  'sharklasers.com',
  'throwawaymail.com',
  'maildrop.cc',
  'fakeinbox.com',
])

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

const VOWELS = /[aeiouAEIOU]/g
const CONSONANTS = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g
const URL_RE = /\bhttps?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|ru|xyz|info|biz|co)\b/gi

function looksLikeGibberish(value: string, minLen: number): boolean {
  const trimmed = value.trim()
  if (trimmed.length < minLen) return false
  // Any whitespace means it's plausibly a real phrase — don't flag.
  if (/\s/.test(trimmed)) return false
  const letters = trimmed.replace(/[^a-zA-Z]/g, '')
  if (letters.length < minLen) return false
  const vowels = (letters.match(VOWELS) || []).length
  const consonants = (letters.match(CONSONANTS) || []).length
  if (vowels === 0) return true
  return consonants / vowels > 3
}

function countUrls(value: string): number {
  return (value.match(URL_RE) || []).length
}

export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase()
  const atIdx = lower.lastIndexOf('@')
  if (atIdx < 0) return lower
  const local = lower.slice(0, atIdx)
  const domain = lower.slice(atIdx + 1)
  const stripTag = local.split('+')[0]
  if (GMAIL_DOMAINS.has(domain)) {
    return `${stripTag.replace(/\./g, '')}@gmail.com`
  }
  return `${stripTag}@${domain}`
}

function emailDomain(email: string): string {
  const atIdx = email.lastIndexOf('@')
  return atIdx < 0 ? '' : email.slice(atIdx + 1).toLowerCase()
}

export async function scoreInquiry(
  input: ScoreInput,
  meta: ScoreMeta
): Promise<ScoreResult> {
  const reasons: string[] = []
  let score = 0

  const add = (weight: number, reason: string) => {
    score += weight
    reasons.push(reason)
  }

  if (looksLikeGibberish(input.name, 13)) {
    add(3, 'gibberish_name')
  }
  if (URL_RE.test(input.name)) {
    URL_RE.lastIndex = 0
    add(3, 'url_in_name')
  }
  URL_RE.lastIndex = 0

  if (input.subject && looksLikeGibberish(input.subject, 13)) {
    add(2, 'gibberish_subject')
  }

  const msg = input.message.trim()
  if (msg.length < 20) {
    add(2, 'message_too_short')
  }
  if (countUrls(msg) >= 2) {
    add(2, 'links_in_message')
  }
  URL_RE.lastIndex = 0

  if (typeof meta.renderedAt === 'number' && meta.renderedAt > 0) {
    const elapsed = meta.now - meta.renderedAt
    if (elapsed >= 0 && elapsed < 3000) {
      add(2, 'submitted_too_fast')
    }
  }

  const domain = emailDomain(input.email)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    add(3, 'disposable_email_domain')
  }

  const normalized = normalizeEmail(input.email)
  const isGmail = GMAIL_DOMAINS.has(domain)
  const rawLocal = input.email.split('@')[0] || ''
  const gmailDotTrick = isGmail && rawLocal.includes('.')

  try {
    const tenMinAgo = new Date(meta.now - 10 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(meta.now - 30 * 24 * 60 * 60 * 1000).toISOString()

    if (gmailDotTrick) {
      const { data } = await meta.supabase
        .from('inquiries')
        .select('id, email, created_at')
        .gte('created_at', thirtyDaysAgo)
        .ilike('email', `%@${domain}`)
        .limit(200)
      const hit = (data as Array<{ email: string }> | null)?.some(
        (row) => normalizeEmail(row.email) === normalized
      )
      if (hit) add(3, 'gmail_dot_abuse_repeat')
    }

    const { data: recent } = await meta.supabase
      .from('inquiries')
      .select('id, email, created_at')
      .gte('created_at', tenMinAgo)
      .ilike('email', `%@${domain}`)
      .limit(50)
    const recentHit = (recent as Array<{ email: string }> | null)?.some(
      (row) => normalizeEmail(row.email) === normalized
    )
    if (recentHit) add(2, 'duplicate_email_recent')
  } catch {
    // Lookup failure should not block submissions; just skip these signals.
  }

  return { score, reasons }
}
