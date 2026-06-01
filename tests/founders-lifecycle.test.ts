import { describe, it, expect } from 'vitest'
import { checkStatusTransition } from '@/lib/founders/lifecycle'

describe('checkStatusTransition', () => {
  it('blocks invited -> active (must use the activate/donation route)', () => {
    expect(checkStatusTransition('invited', 'active')).toBe('needs-activation')
  })

  it('allows invited -> declined', () => {
    expect(checkStatusTransition('invited', 'declined')).toBe('ok')
  })

  it('allows un-pausing (paused -> active) and pausing (active -> paused)', () => {
    expect(checkStatusTransition('paused', 'active')).toBe('ok')
    expect(checkStatusTransition('active', 'paused')).toBe('ok')
  })

  it('allows re-invite (declined -> invited and archived -> invited)', () => {
    expect(checkStatusTransition('declined', 'invited')).toBe('ok')
    expect(checkStatusTransition('archived', 'invited')).toBe('ok')
  })

  it('treats an unchanged status as a no-op', () => {
    expect(checkStatusTransition('active', 'active')).toBe('ok')
    expect(checkStatusTransition('invited', 'invited')).toBe('ok')
  })

  it('forbids nonsensical jumps (invited -> archived)', () => {
    expect(checkStatusTransition('invited', 'archived')).toBe('forbidden')
  })
})
