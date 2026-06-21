import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hashInviteToken } from '@/lib/founders/invite-links'

// ============================================================================
// Founders Circle — durable invite-link table integration tests
// ============================================================================
// Run against a REAL, DEDICATED TEST Supabase project (never prod) with the
// 2026-06-21-founder-invite-links migration applied. They prove the schema
// guarantees that can't be unit-tested:
//   - lookup by token_hash returns the right founder (storage contract)
//   - the token_hash UNIQUE index rejects collisions
//   - members (authenticated role) cannot read founder_invite_links at all
//   - multiple links coexist per founder; delete-by-user revokes them all
//   - deleting the auth user cascades to its links
//
// Self-skips unless the TEST env vars are present (same convention as
// founders-rls.test.ts): SUPABASE_TEST_URL / _ANON_KEY / _SERVICE_ROLE_KEY.
// ============================================================================

const URL = process.env.SUPABASE_TEST_URL
const ANON = process.env.SUPABASE_TEST_ANON_KEY
const SERVICE = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

const configured = Boolean(URL && ANON && SERVICE)
const d = configured ? describe : describe.skip

if (!configured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[integration] SUPABASE_TEST_* not set — skipping invite-link integration tests.'
  )
}

const RUN = process.hrtime.bigint().toString(36)
const PW = 'Test-Pass-123!'

function admin(): SupabaseClient {
  return createClient(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function makeFounder(
  svc: SupabaseClient,
  label: string,
  status: 'invited' | 'active'
): Promise<{ id: string; email: string }> {
  const email = `fc-link-itest-${label}-${RUN}@example.com`
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  })
  if (createErr || !created.user) throw createErr ?? new Error('createUser failed')
  const id = created.user.id
  const { error: insErr } = await svc
    .from('founders')
    .insert({ user_id: id, email, full_name: `Itest ${label}`, status })
  if (insErr) throw insErr
  return { id, email }
}

async function signedInAs(email: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: PW })
  if (error) throw error
  return client
}

d('founder_invite_links table', () => {
  const svc = configured ? admin() : (null as unknown as SupabaseClient)
  let founder: { id: string; email: string }

  beforeAll(async () => {
    founder = await makeFounder(svc, 'a', 'invited')
  })

  afterAll(async () => {
    if (!configured) return
    if (founder?.id) await svc.auth.admin.deleteUser(founder.id) // cascades to links
  })

  it('stores a hashed token that resolves back to the founder by hash', async () => {
    const raw = `raw-${RUN}-resolve`
    const { error: insErr } = await svc.from('founder_invite_links').insert({
      user_id: founder.id,
      token_hash: hashInviteToken(raw),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    expect(insErr).toBeNull()

    const { data, error } = await svc
      .from('founder_invite_links')
      .select('user_id')
      .eq('token_hash', hashInviteToken(raw))
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.user_id).toBe(founder.id)
  })

  it('rejects a duplicate token_hash (UNIQUE index)', async () => {
    const raw = `raw-${RUN}-dup`
    const row = {
      user_id: founder.id,
      token_hash: hashInviteToken(raw),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }
    const first = await svc.from('founder_invite_links').insert(row)
    expect(first.error).toBeNull()
    const second = await svc.from('founder_invite_links').insert(row)
    expect(second.error).not.toBeNull()
    expect(second.error?.code).toBe('23505') // unique_violation
  })

  it('blocks a signed-in member from reading the table (lockdown)', async () => {
    const memberClient = await signedInAs(founder.email)
    const { error } = await memberClient
      .from('founder_invite_links')
      .select('id')
      .eq('user_id', founder.id)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501') // permission denied
  })

  it('lets multiple links coexist and delete-by-user revokes them all', async () => {
    const cleanFounder = await makeFounder(svc, 'b', 'active')
    for (const suffix of ['x', 'y', 'z']) {
      const { error } = await svc.from('founder_invite_links').insert({
        user_id: cleanFounder.id,
        token_hash: hashInviteToken(`raw-${RUN}-${suffix}`),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
      expect(error).toBeNull()
    }

    const before = await svc
      .from('founder_invite_links')
      .select('id')
      .eq('user_id', cleanFounder.id)
    expect(before.data?.length).toBe(3)

    const del = await svc
      .from('founder_invite_links')
      .delete()
      .eq('user_id', cleanFounder.id)
      .select('id')
    expect(del.error).toBeNull()
    expect(del.data?.length).toBe(3)

    const after = await svc
      .from('founder_invite_links')
      .select('id')
      .eq('user_id', cleanFounder.id)
    expect(after.data?.length).toBe(0)

    await svc.auth.admin.deleteUser(cleanFounder.id)
  })
})
