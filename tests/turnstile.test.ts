import { describe, it, expect, vi } from 'vitest'
import { turnstileMode, verifyTurnstile } from '@/lib/api/turnstile'

const ON = { TURNSTILE_SECRET_KEY: 'secret', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site' }

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
}

describe('turnstileMode', () => {
  it('is off with neither key', () => expect(turnstileMode({})).toBe('off'))
  it('is on with both keys', () => expect(turnstileMode(ON)).toBe('on'))
  it('is misconfigured with only the secret', () =>
    expect(turnstileMode({ TURNSTILE_SECRET_KEY: 's' })).toBe('misconfigured'))
  it('is misconfigured with only the site key', () =>
    expect(turnstileMode({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: 's' })).toBe('misconfigured'))
})

describe('verifyTurnstile', () => {
  it('allows everything when off, without calling Cloudflare', async () => {
    const f = fakeFetch({ success: false })
    expect((await verifyTurnstile(undefined, '1.2.3.4', { env: {}, fetchImpl: f })).ok).toBe(true)
    expect(f).not.toHaveBeenCalled()
  })

  it('allows (and logs) when misconfigured, so real visitors are not locked out', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await verifyTurnstile(undefined, null, {
      env: { TURNSTILE_SECRET_KEY: 's' },
      fetchImpl: fakeFetch({}),
    })
    expect(res).toEqual({ ok: true, reason: 'misconfigured' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('refuses a missing token when on', async () => {
    const f = fakeFetch({ success: true })
    expect(await verifyTurnstile('', '1.2.3.4', { env: ON, fetchImpl: f })).toEqual({
      ok: false,
      reason: 'missing_token',
    })
    expect(f).not.toHaveBeenCalled()
  })

  it('accepts a token Cloudflare accepts, and forwards secret + ip', async () => {
    const f = fakeFetch({ success: true })
    expect((await verifyTurnstile('tok', '1.2.3.4', { env: ON, fetchImpl: f })).ok).toBe(true)
    const body = (f as unknown as { mock: { calls: [string, { body: URLSearchParams }][] } }).mock
      .calls[0][1].body
    expect(body.get('secret')).toBe('secret')
    expect(body.get('response')).toBe('tok')
    expect(body.get('remoteip')).toBe('1.2.3.4')
  })

  it('refuses a token Cloudflare rejects', async () => {
    const res = await verifyTurnstile('tok', null, {
      env: ON,
      fetchImpl: fakeFetch({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    })
    expect(res).toEqual({ ok: false, reason: 'timeout-or-duplicate' })
  })

  it('fails open when Cloudflare is unreachable', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await verifyTurnstile('tok', null, { env: ON, fetchImpl: fakeFetch({}, 502) })
    expect(res).toEqual({ ok: true, reason: 'verify_unavailable' })
    spy.mockRestore()
  })
})
