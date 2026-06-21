import { describe, it, expect } from 'vitest'
import {
  hashInviteToken,
  isInviteLinkValid,
  isLinkEligibleStatus,
  INVITE_LINK_TTL_MS,
} from '@/lib/founders/invite-links'

describe('hashInviteToken', () => {
  it('is deterministic for the same input', () => {
    expect(hashInviteToken('abc123')).toBe(hashInviteToken('abc123'))
  })

  it('produces a 64-char lowercase hex SHA-256 digest', () => {
    expect(hashInviteToken('abc123')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different digests for different inputs', () => {
    expect(hashInviteToken('token-a')).not.toBe(hashInviteToken('token-b'))
  })
})

describe('isInviteLinkValid', () => {
  const now = new Date('2026-06-21T12:00:00.000Z')

  it('accepts an expiry in the future', () => {
    expect(isInviteLinkValid('2026-06-22T12:00:00.000Z', now)).toBe(true)
  })

  it('rejects an expiry in the past', () => {
    expect(isInviteLinkValid('2026-06-20T12:00:00.000Z', now)).toBe(false)
  })

  it('rejects an expiry exactly equal to now (expired boundary)', () => {
    expect(isInviteLinkValid('2026-06-21T12:00:00.000Z', now)).toBe(false)
  })

  it('rejects an unparseable expiry', () => {
    expect(isInviteLinkValid('not-a-date', now)).toBe(false)
  })
})

describe('isLinkEligibleStatus', () => {
  it('allows invited and active', () => {
    expect(isLinkEligibleStatus('invited')).toBe(true)
    expect(isLinkEligibleStatus('active')).toBe(true)
  })

  it('rejects paused, declined, and archived (they dead-end)', () => {
    expect(isLinkEligibleStatus('paused')).toBe(false)
    expect(isLinkEligibleStatus('declined')).toBe(false)
    expect(isLinkEligibleStatus('archived')).toBe(false)
  })
})

describe('INVITE_LINK_TTL_MS', () => {
  it('is 30 days in milliseconds', () => {
    expect(INVITE_LINK_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })
})
