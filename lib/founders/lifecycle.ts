// Founder status lifecycle — the allowed transitions via the admin status
// dropdown (PATCH). `invited -> active` is intentionally excluded here:
// activation is the donation money-gate and must go through the dedicated
// POST .../activate route so the donation is recorded.
export type FounderStatus = 'invited' | 'active' | 'paused' | 'archived' | 'declined'

export const ALLOWED_STATUS_TRANSITIONS: Record<FounderStatus, FounderStatus[]> = {
  invited: ['declined'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  archived: ['invited', 'active'],
  declined: ['invited'],
}

/**
 * Result of validating a requested status change.
 *  - 'ok'                : allowed (or a no-op when from === to)
 *  - 'needs-activation'  : invited -> active must use the activate route
 *  - 'forbidden'         : not a permitted transition
 */
export function checkStatusTransition(
  from: string,
  to: string
): 'ok' | 'needs-activation' | 'forbidden' {
  if (from === to) return 'ok'
  if (from === 'invited' && to === 'active') return 'needs-activation'
  const allowed = ALLOWED_STATUS_TRANSITIONS[from as FounderStatus] ?? []
  return allowed.includes(to as FounderStatus) ? 'ok' : 'forbidden'
}
