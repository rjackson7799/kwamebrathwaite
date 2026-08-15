import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Smart Import — publish_import_item() integration tests
// ============================================================================
// These run against a REAL, DEDICATED TEST Supabase project (never prod) with
// 2026-08-14-content-import.sql applied. They prove the guarantees that live
// entirely inside the database and therefore cannot be unit-tested:
//
//   - the conditional UPDATE claim makes publish idempotent under a double
//     submission (the second call gets ALREADY_CLAIMED, not a second write)
//   - a spoofed p_actor is rejected by is_admin() INSIDE the function, even
//     though the caller holds service-role and bypasses RLS
//   - the RPC is not executable by anon or authenticated
//   - the field allowlist is re-enforced at the DB boundary, not just in the route
//   - a failed write leaves the item PERSISTENTLY 'failed' — this is the
//     nested EXCEPTION block / implicit savepoint behaviour, and it is the one
//     thing that would silently break the retry state machine if it regressed
//   - a live (published) target cannot be updated without reviewed_at
//   - a stale target returns STALE_TARGET as a NORMAL return, not an exception
//   - deleting a target nulls the FK, preserves published_snapshot, and the
//     DELETE actually succeeds (the CHECK references the snapshot, not the FK)
//
// They self-skip unless the TEST env vars are present, so `npm run test` and a
// bare CI checkout stay green.
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
    '[integration] SUPABASE_TEST_* not set — skipping Smart Import RPC tests. ' +
      'Point them at a DEDICATED test project (never prod) to enable.'
  )
}

// Unique suffix so repeated runs don't collide on slug/email UNIQUE constraints.
const RUN = process.hrtime.bigint().toString(36)
const PW = 'Test-Pass-123!'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

function admin(): SupabaseClient {
  return createClient(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface RpcResult {
  ok: boolean
  code: string
  entity_id?: string
  field?: string
  message?: string
}

async function callPublish(
  svc: SupabaseClient,
  args: {
    itemId: string
    actor: string | null
    targetType?: 'exhibition' | 'press'
    expectedUpdatedAt?: string | null
    payload: Record<string, unknown>
    applyMask?: string[]
  }
): Promise<RpcResult> {
  const { data, error } = await (svc as Db).rpc('publish_import_item', {
    p_item_id: args.itemId,
    p_actor: args.actor,
    p_target_type: args.targetType ?? 'exhibition',
    p_expected_updated_at: args.expectedUpdatedAt ?? null,
    p_payload: args.payload,
    p_apply_mask: args.applyMask ?? [],
  })
  if (error) throw error
  return data as RpcResult
}

d('publish_import_item()', () => {
  const svc = configured ? admin() : (null as unknown as SupabaseClient)

  let adminUser: { id: string; email: string }
  let nonAdminUser: { id: string; email: string }
  let importId: string
  const createdExhibitionIds: string[] = []

  // Each test gets its own item — the claim is one-shot by design, so items
  // cannot be shared between tests without the tests coupling to each other.
  let nextIndex = 0
  async function makeItem(overrides: Record<string, unknown> = {}): Promise<string> {
    const index = nextIndex++
    const { data, error } = await (svc as Db)
      .from('content_import_items')
      .insert({
        import_id: importId,
        source_index: index,
        source_text: `PROBE ENTRY ${index}`,
        target_type: 'exhibition',
        entry_kind: 'screening',
        parsed_data: { title: `Probe ${RUN} ${index}` },
        ...overrides,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  // A real exhibition to match against, so update paths have a live target.
  async function makeExhibition(
    label: string,
    status: 'draft' | 'published'
  ): Promise<{ id: string; updated_at: string; slug: string }> {
    const { data, error } = await (svc as Db)
      .from('exhibitions')
      .insert({
        title: `Probe Target ${label} ${RUN}`,
        slug: `probe-target-${label}-${RUN}`,
        venue: 'Probe Gallery',
        city: 'Toronto',
        country: 'Canada',
        start_date: '2026-10-01',
        end_date: '2026-10-31',
        exhibition_type: 'upcoming',
        status,
      })
      .select('id, updated_at, slug')
      .single()
    if (error) throw error
    createdExhibitionIds.push(data.id)
    return data
  }

  async function getItem(id: string): Promise<Db> {
    const { data, error } = await (svc as Db)
      .from('content_import_items')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  beforeAll(async () => {
    const adminEmail = `import-itest-admin-${RUN}@example.com`
    const { data: a, error: aErr } = await svc.auth.admin.createUser({
      email: adminEmail,
      password: PW,
      email_confirm: true,
    })
    if (aErr || !a.user) throw aErr ?? new Error('createUser failed')
    adminUser = { id: a.user.id, email: adminEmail }

    const { error: insErr } = await (svc as Db)
      .from('admins')
      .insert({ user_id: adminUser.id, email: adminEmail })
    if (insErr) throw insErr

    // A real auth user who is deliberately NOT in admins — a Founders Circle
    // member is exactly this shape, and shares the same auth pool.
    const nonAdminEmail = `import-itest-nonadmin-${RUN}@example.com`
    const { data: n, error: nErr } = await svc.auth.admin.createUser({
      email: nonAdminEmail,
      password: PW,
      email_confirm: true,
    })
    if (nErr || !n.user) throw nErr ?? new Error('createUser failed')
    nonAdminUser = { id: n.user.id, email: nonAdminEmail }

    const { data: imp, error: impErr } = await (svc as Db)
      .from('content_imports')
      .insert({
        raw_text: 'PROBE BATCH',
        source_label: `import-itest-${RUN}`,
        status: 'ready',
        created_by: adminUser.id,
      })
      .select('id')
      .single()
    if (impErr) throw impErr
    importId = imp.id
  })

  afterAll(async () => {
    if (!configured) return
    // Items cascade from the batch; exhibitions the RPC created do not.
    await (svc as Db).from('content_imports').delete().eq('id', importId)
    for (const id of createdExhibitionIds) {
      await (svc as Db).from('exhibitions').delete().eq('id', id)
    }
    const { data: strays } = await (svc as Db)
      .from('exhibitions')
      .select('id')
      .like('slug', `%${RUN}%`)
    for (const row of strays ?? []) {
      await (svc as Db).from('exhibitions').delete().eq('id', row.id)
    }
    if (adminUser?.id) await svc.auth.admin.deleteUser(adminUser.id)
    if (nonAdminUser?.id) await svc.auth.admin.deleteUser(nonAdminUser.id)
  })

  // --------------------------------------------------------------------------
  // Authorization — service-role bypasses RLS, so this function is the gate
  // --------------------------------------------------------------------------

  it('rejects a non-admin p_actor even when the caller holds service-role', async () => {
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: nonAdminUser.id,
      payload: { title: `Never written ${RUN}`, slug: `never-written-a-${RUN}`, status: 'draft' },
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('FORBIDDEN')

    // Rejected BEFORE the claim: the item must still be publishable.
    const item = await getItem(itemId)
    expect(item.status).toBe('pending')
  })

  it('rejects a null p_actor', async () => {
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: null,
      payload: { title: `Never written ${RUN}`, slug: `never-written-b-${RUN}`, status: 'draft' },
    })
    expect(result.code).toBe('FORBIDDEN')
  })

  it('is not executable by anon or by an authenticated non-admin', async () => {
    // The grant, not the p_actor check — a caller holding only an anon or
    // member JWT must not be able to reach the function at all.
    const itemId = await makeItem()

    const anonClient = createClient(URL!, ANON!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const anonCall = await (anonClient as Db).rpc('publish_import_item', {
      p_item_id: itemId,
      p_actor: adminUser.id,
      p_target_type: 'exhibition',
      p_expected_updated_at: null,
      p_payload: { title: 'nope', slug: `nope-${RUN}`, status: 'draft' },
      p_apply_mask: [],
    })
    expect(anonCall.error).not.toBeNull()

    const memberClient = createClient(URL!, ANON!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInErr } = await memberClient.auth.signInWithPassword({
      email: nonAdminUser.email,
      password: PW,
    })
    expect(signInErr).toBeNull()

    const memberCall = await (memberClient as Db).rpc('publish_import_item', {
      p_item_id: itemId,
      p_actor: adminUser.id,
      p_target_type: 'exhibition',
      p_expected_updated_at: null,
      p_payload: { title: 'nope', slug: `nope2-${RUN}`, status: 'draft' },
      p_apply_mask: [],
    })
    expect(memberCall.error).not.toBeNull()

    const item = await getItem(itemId)
    expect(item.status).toBe('pending')
  })

  // --------------------------------------------------------------------------
  // Allowlist, re-enforced at the DB boundary
  // --------------------------------------------------------------------------

  it('aborts on a payload key outside the per-target allowlist', async () => {
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      payload: {
        title: `Allowlist probe ${RUN}`,
        slug: `allowlist-probe-${RUN}`,
        status: 'draft',
        // Not writable by import under any circumstances.
        display_order: 99,
      },
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('DISALLOWED_FIELD')
    expect(result.field).toBe('display_order')

    // Refused before the claim — nothing was written and the item is intact.
    const item = await getItem(itemId)
    expect(item.status).toBe('pending')
  })

  it('rejects a press-only field on an exhibition target', async () => {
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      payload: {
        title: `Cross-target probe ${RUN}`,
        slug: `cross-target-probe-${RUN}`,
        status: 'draft',
        publication: 'The New York Times',
      },
    })

    expect(result.code).toBe('DISALLOWED_FIELD')
    expect(result.field).toBe('publication')
  })

  // --------------------------------------------------------------------------
  // Idempotency — the conditional UPDATE is the claim
  // --------------------------------------------------------------------------

  it('publishes a create exactly once under a double submission', async () => {
    const itemId = await makeItem()
    const payload = {
      title: `Idempotency probe ${RUN}`,
      slug: `idempotency-probe-${RUN}`,
      status: 'draft',
      venue: 'Probe Gallery',
      city: 'Parramatta',
      country: 'Australia',
      start_date: '2026-09-06',
      exhibition_type: 'upcoming',
      entry_kind: 'screening',
    }

    // Fired concurrently, as a double-click or a browser retry would.
    const [first, second] = await Promise.all([
      callPublish(svc, { itemId, actor: adminUser.id, payload }),
      callPublish(svc, { itemId, actor: adminUser.id, payload }),
    ])

    const results = [first, second]
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => r.code === 'ALREADY_CLAIMED')).toHaveLength(1)

    // One row, not two.
    const { data: rows } = await (svc as Db)
      .from('exhibitions')
      .select('id')
      .eq('slug', payload.slug)
    expect(rows).toHaveLength(1)
    if (rows?.[0]?.id) createdExhibitionIds.push(rows[0].id)

    const item = await getItem(itemId)
    expect(item.status).toBe('published')
    expect(item.published_snapshot).not.toBeNull()
    expect(item.published_exhibition_id).toBe(rows![0].id)
  })

  it('refuses to re-publish an already-published item', async () => {
    const itemId = await makeItem()
    const payload = {
      title: `Terminal probe ${RUN}`,
      slug: `terminal-probe-${RUN}`,
      status: 'draft',
      exhibition_type: 'upcoming',
      entry_kind: 'exhibition',
    }

    const first = await callPublish(svc, { itemId, actor: adminUser.id, payload })
    expect(first.ok).toBe(true)
    if (first.entity_id) createdExhibitionIds.push(first.entity_id)

    // 'published' is terminal — a later call is rejected, never re-run.
    const second = await callPublish(svc, { itemId, actor: adminUser.id, payload })
    expect(second.ok).toBe(false)
    expect(second.code).toBe('ALREADY_CLAIMED')

    const { data: rows } = await (svc as Db)
      .from('exhibitions')
      .select('id')
      .eq('slug', payload.slug)
    expect(rows).toHaveLength(1)
  })

  // --------------------------------------------------------------------------
  // Failure durability — the nested EXCEPTION block / implicit savepoint
  // --------------------------------------------------------------------------

  it('leaves the item persistently failed when the write raises', async () => {
    // title is NOT NULL on exhibitions, so this raises inside the write. The
    // point of the test is that the 'failed' transition SURVIVES the rollback
    // of that write — without the nested block it would roll back too and the
    // item would sit at 'pending' forever, silently breaking retry.
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      payload: { title: null, slug: `write-failure-${RUN}`, status: 'draft' },
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('WRITE_FAILED')

    const item = await getItem(itemId)
    expect(item.status).toBe('failed')
    expect(item.error_message).toBeTruthy()

    // And nothing was written.
    const { data: rows } = await (svc as Db)
      .from('exhibitions')
      .select('id')
      .eq('slug', `write-failure-${RUN}`)
    expect(rows).toHaveLength(0)
  })

  // --------------------------------------------------------------------------
  // Update safety
  // --------------------------------------------------------------------------

  it('blocks a live update that has no reviewed_at', async () => {
    const target = await makeExhibition('live-unreviewed', 'published')
    const itemId = await makeItem({
      action: 'update',
      match_exhibition_id: target.id,
      match_target_updated_at: target.updated_at,
      match_snapshot: { id: target.id, type: 'exhibition' },
      apply_mask: ['end_date'],
      // reviewed_at deliberately absent
    })

    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      expectedUpdatedAt: target.updated_at,
      payload: { end_date: '2026-11-30' },
      applyMask: ['end_date'],
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('NOT_REVIEWED')

    // The claim is released, so the item can be published after review.
    const item = await getItem(itemId)
    expect(item.status).toBe('pending')

    const { data: after } = await (svc as Db)
      .from('exhibitions')
      .select('end_date')
      .eq('id', target.id)
      .single()
    expect(after.end_date).toBe('2026-10-31')
  })

  it('allows a live update once reviewed_at is set, writing only masked fields', async () => {
    const target = await makeExhibition('live-reviewed', 'published')
    const itemId = await makeItem({
      action: 'update',
      match_exhibition_id: target.id,
      match_target_updated_at: target.updated_at,
      match_snapshot: { id: target.id, type: 'exhibition' },
      apply_mask: ['end_date'],
      reviewed_at: new Date(0).toISOString(),
    })

    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      expectedUpdatedAt: target.updated_at,
      // venue is supplied but NOT masked — it must not be written.
      payload: { end_date: '2026-11-30', venue: 'Should Not Be Written' },
      applyMask: ['end_date'],
    })

    expect(result.ok).toBe(true)
    expect(result.code).toBe('PUBLISHED')

    const { data: after } = await (svc as Db)
      .from('exhibitions')
      .select('end_date, venue, slug, status')
      .eq('id', target.id)
      .single()
    expect(after.end_date).toBe('2026-11-30')
    expect(after.venue).toBe('Probe Gallery')
    // slug and status are never written on update.
    expect(after.slug).toBe(target.slug)
    expect(after.status).toBe('published')
  })

  it('never writes slug or status even when the apply mask names them', async () => {
    const target = await makeExhibition('mask-escalation', 'published')
    const itemId = await makeItem({
      action: 'update',
      match_exhibition_id: target.id,
      match_target_updated_at: target.updated_at,
      match_snapshot: { id: target.id, type: 'exhibition' },
      apply_mask: ['slug', 'status', 'city'],
      reviewed_at: new Date(0).toISOString(),
    })

    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      expectedUpdatedAt: target.updated_at,
      payload: { slug: `hijacked-${RUN}`, status: 'draft', city: 'Philadelphia' },
      applyMask: ['slug', 'status', 'city'],
    })

    expect(result.ok).toBe(true)

    const { data: after } = await (svc as Db)
      .from('exhibitions')
      .select('slug, status, city')
      .eq('id', target.id)
      .single()
    expect(after.slug).toBe(target.slug)
    expect(after.status).toBe('published')
    expect(after.city).toBe('Philadelphia')
  })

  it('returns STALE_TARGET as a normal return when the target moved', async () => {
    const target = await makeExhibition('stale', 'published')
    const itemId = await makeItem({
      action: 'update',
      match_exhibition_id: target.id,
      match_target_updated_at: target.updated_at,
      match_snapshot: { id: target.id, type: 'exhibition' },
      apply_mask: ['end_date'],
      reviewed_at: new Date(0).toISOString(),
    })

    // Someone edits the exhibition after the diff was approved.
    await (svc as Db)
      .from('exhibitions')
      .update({ description: 'Edited by a human after matching' })
      .eq('id', target.id)

    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      expectedUpdatedAt: target.updated_at, // now out of date
      payload: { end_date: '2026-12-31' },
      applyMask: ['end_date'],
    })

    // A normal structured return, not a raised exception.
    expect(result.ok).toBe(false)
    expect(result.code).toBe('STALE_TARGET')

    const item = await getItem(itemId)
    expect(item.status).toBe('failed')

    const { data: after } = await (svc as Db)
      .from('exhibitions')
      .select('end_date')
      .eq('id', target.id)
      .single()
    expect(after.end_date).toBe('2026-10-31')
  })

  it('fails an update whose mask selects no writable field', async () => {
    const target = await makeExhibition('empty-mask', 'draft')
    const itemId = await makeItem({
      action: 'update',
      match_exhibition_id: target.id,
      match_target_updated_at: target.updated_at,
      match_snapshot: { id: target.id, type: 'exhibition' },
      apply_mask: [],
    })

    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      expectedUpdatedAt: target.updated_at,
      payload: { end_date: '2026-12-31' },
      applyMask: [],
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('NOT_UPDATABLE')
  })

  it('refuses to publish an item whose action is skip', async () => {
    const itemId = await makeItem({ action: 'skip', status: 'pending' })
    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      payload: { title: `Skip probe ${RUN}`, slug: `skip-probe-${RUN}`, status: 'draft' },
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('NOT_UPDATABLE')

    // The claim is released rather than left dangling.
    const item = await getItem(itemId)
    expect(item.status).toBe('pending')

    const { data: rows } = await (svc as Db)
      .from('exhibitions')
      .select('id')
      .eq('slug', `skip-probe-${RUN}`)
    expect(rows).toHaveLength(0)
  })

  // --------------------------------------------------------------------------
  // Audit durability
  // --------------------------------------------------------------------------

  it('writes the activity row inside the publish transaction', async () => {
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      payload: {
        title: `Audit probe ${RUN}`,
        slug: `audit-probe-${RUN}`,
        status: 'draft',
        exhibition_type: 'upcoming',
        entry_kind: 'talk',
      },
    })
    expect(result.ok).toBe(true)
    if (result.entity_id) createdExhibitionIds.push(result.entity_id)

    // The route never writes this row, so its presence proves the RPC did —
    // i.e. a route that died right after the RPC returned would still have it.
    const { data: rows } = await (svc as Db)
      .from('activity_log')
      .select('action, entity_type, entity_id, user_email, changes')
      .eq('entity_id', result.entity_id)

    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('create')
    expect(rows[0].entity_type).toBe('exhibition')
    expect(rows[0].user_email).toBe(adminUser.email)
    expect(rows[0].changes.source).toBe('smart_import')
    expect(rows[0].changes.import_item_id).toBe(itemId)
  })

  // --------------------------------------------------------------------------
  // Snapshots outlive their targets
  // --------------------------------------------------------------------------

  it('lets a published target be deleted, keeping the snapshot and nulling the FK', async () => {
    const itemId = await makeItem()
    const result = await callPublish(svc, {
      itemId,
      actor: adminUser.id,
      payload: {
        title: `Deletion probe ${RUN}`,
        slug: `deletion-probe-${RUN}`,
        status: 'draft',
        exhibition_type: 'upcoming',
        entry_kind: 'exhibition',
      },
    })
    expect(result.ok).toBe(true)

    const before = await getItem(itemId)
    expect(before.published_exhibition_id).toBe(result.entity_id)

    // If cii_published_needs_snapshot referenced the FK instead of the
    // snapshot, ON DELETE SET NULL would violate the CHECK and this DELETE
    // would fail outright.
    const { error: delErr } = await (svc as Db)
      .from('exhibitions')
      .delete()
      .eq('id', result.entity_id)
    expect(delErr).toBeNull()

    const after = await getItem(itemId)
    expect(after.status).toBe('published')
    expect(after.published_exhibition_id).toBeNull()
    expect(after.published_snapshot).not.toBeNull()
    expect(after.published_snapshot.title).toBe(`Deletion probe ${RUN}`)
    expect(after.published_snapshot.id).toBe(result.entity_id)
  })

  // --------------------------------------------------------------------------
  // Immutability
  // --------------------------------------------------------------------------

  it('refuses to mutate parsed_data after insert', async () => {
    const itemId = await makeItem()
    const { error } = await (svc as Db)
      .from('content_import_items')
      .update({ parsed_data: { title: 'tampered' } })
      .eq('id', itemId)

    // Service-role does not exempt anyone from the freeze trigger.
    expect(error).not.toBeNull()

    const item = await getItem(itemId)
    expect(item.parsed_data.title).not.toBe('tampered')
  })
})
