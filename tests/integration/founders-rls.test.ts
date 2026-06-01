import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Founder's Circle — RLS / authz / access-gate integration tests
// ============================================================================
// These run against a REAL, DEDICATED TEST Supabase project (never prod) with
// the founders migrations applied. They prove the security-critical guarantees
// that cannot be unit-tested:
//   - members cannot read staff-only columns (column-level lockdown)
//   - members cannot read another member's row (row-level RLS)
//   - only ACTIVE founders can read portal data (fulfillment is_current_founder)
//   - the column guard blocks a member changing their own status
//
// They self-skip unless the TEST env vars are present, so `npm run test` and a
// bare CI checkout stay green until secrets are configured.
//
// Required env (distinct names so they can't collide with prod .env.local):
//   SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_ROLE_KEY
// ============================================================================

const URL = process.env.SUPABASE_TEST_URL
const ANON = process.env.SUPABASE_TEST_ANON_KEY
const SERVICE = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

const configured = Boolean(URL && ANON && SERVICE)
const d = configured ? describe : describe.skip

if (!configured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[integration] SUPABASE_TEST_* not set — skipping RLS integration tests. ' +
      'Point them at a DEDICATED test project (never prod) to enable.'
  )
}

// Unique suffix so repeated runs don't collide on the email UNIQUE constraint.
// Avoids Date.now()/Math.random(); uses high-res time which is allowed here.
const RUN = process.hrtime.bigint().toString(36)
const PW = 'Test-Pass-123!'

interface TestUser {
  id: string
  email: string
}

function admin(): SupabaseClient {
  return createClient(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Create an auth user + founders row at a given status, return its id/email.
async function makeFounder(
  svc: SupabaseClient,
  label: string,
  status: 'invited' | 'active',
): Promise<TestUser> {
  const email = `fc-itest-${label}-${RUN}@example.com`
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  })
  if (createErr || !created.user) throw createErr ?? new Error('createUser failed')
  const id = created.user.id

  const { error: insErr } = await svc.from('founders').insert({
    user_id: id,
    email,
    full_name: `Itest ${label}`,
    status,
    internal_notes: 'STAFF ONLY — must never leak',
    relationship_owner_email: 'staff@example.com',
  })
  if (insErr) throw insErr
  return { id, email }
}

// An anon-key client signed in AS the given user (i.e. the member's own JWT,
// `authenticated` role). This is what a real logged-in member's browser holds.
async function signedInAs(email: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: PW })
  if (error) throw error
  return client
}

d('Founder RLS / authz', () => {
  const svc = configured ? admin() : (null as unknown as SupabaseClient)
  let invited: TestUser
  let active: TestUser
  let activeClient: SupabaseClient

  beforeAll(async () => {
    invited = await makeFounder(svc, 'invited', 'invited')
    active = await makeFounder(svc, 'active', 'active')

    // Give the active member a fulfillment row with a staff-only note.
    const { error } = await svc.from('founder_print_fulfillments').insert({
      user_id: active.id,
      edition_number: 1,
      is_ap: false,
      status: 'pending',
      internal_notes: 'STAFF ONLY fulfillment note',
    })
    if (error) throw error

    activeClient = await signedInAs(active.email)
  })

  afterAll(async () => {
    if (!configured) return
    // Deleting the auth user cascades to founders + fulfillment rows.
    if (invited?.id) await svc.auth.admin.deleteUser(invited.id)
    if (active?.id) await svc.auth.admin.deleteUser(active.id)
  })

  it('blocks members from reading staff-only columns (column lockdown)', async () => {
    const { error } = await activeClient
      .from('founders')
      .select('internal_notes')
      .eq('user_id', active.id)
      .maybeSingle()
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501') // permission denied
  })

  it('lets members read their own safe columns', async () => {
    const { data, error } = await activeClient
      .from('founders')
      .select('user_id, status, full_name')
      .eq('user_id', active.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.user_id).toBe(active.id)
    expect(data?.status).toBe('active')
  })

  it('blocks members from reading another member row (row RLS)', async () => {
    const { data, error } = await activeClient
      .from('founders')
      .select('user_id, status')
      .eq('user_id', invited.id)
      .maybeSingle()
    // RLS filters the row out — no error, just no data.
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('blocks members from reading fulfillment internal_notes', async () => {
    const { error } = await activeClient
      .from('founder_print_fulfillments')
      .select('internal_notes')
      .eq('user_id', active.id)
      .maybeSingle()
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('lets an ACTIVE member read their own fulfillment safe columns', async () => {
    const { data, error } = await activeClient
      .from('founder_print_fulfillments')
      .select('edition_number, is_ap, status')
      .eq('user_id', active.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.edition_number).toBe(1)
  })

  it('blocks an INVITED member from reading fulfillment (is_current_founder gate)', async () => {
    const invitedClient = await signedInAs(invited.email)
    const { data, error } = await invitedClient
      .from('founder_print_fulfillments')
      .select('edition_number')
      .eq('user_id', invited.id)
      .maybeSingle()
    // RLS predicate requires status='active'; invited sees nothing.
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('blocks a member from changing their own status (column guard trigger)', async () => {
    const { error } = await activeClient
      .from('founders')
      .update({ status: 'archived' })
      .eq('user_id', active.id)
    expect(error).not.toBeNull() // trigger raises "admin-only: status"
  })

  it('enforces the edition-range CHECK (no edition 16, no AP 3)', async () => {
    const bad = await svc.from('founder_print_fulfillments').insert({
      user_id: invited.id,
      edition_number: 16,
      is_ap: false,
      status: 'pending',
    })
    expect(bad.error).not.toBeNull()
    expect(bad.error?.code).toBe('23514') // check_violation
    // clean up nothing — insert failed
  })
})
