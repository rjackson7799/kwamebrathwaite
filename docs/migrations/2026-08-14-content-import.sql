-- ============================================================================
-- Smart Import — AI paste-and-parse staging for exhibitions + press
-- ============================================================================
-- Adds:
--   - exhibitions.entry_kind        ('exhibition'|'screening'|'talk'|'event')
--   - content_imports               one row per pasted block
--   - content_import_items          one row per detected entry, reviewable
--   - freeze trigger                parsed_data / source_text immutable after insert
--   - publish_import_item()         atomic, idempotent per-item publish
--
-- Depends on:
--   - public.is_admin(uuid)         from 2026-05-22-admins-and-rls-refactor.sql
--   - admins(user_id, email)        from 2026-05-22-admins-and-rls-refactor.sql
--   - update_updated_at_column()    from DATABASE_SCHEMA.sql
--   - exhibitions, press, activity_log
--
-- Run via: Supabase SQL editor.
--
-- APPLY-ONCE. `ADD COLUMN IF NOT EXISTS` and DROP+CREATE constraint are
-- repeatable, but `CREATE TABLE IF NOT EXISTS` will NOT upgrade a partially
-- created older table. This file assumes a clean apply; schema drift must be
-- corrected by a follow-up versioned migration, never by re-running this one.
--
-- After running: regenerate types to a TEMP file and review the diff first:
--   npx supabase gen types typescript --linked > /tmp/types.new.ts
--   diff lib/supabase/types.ts /tmp/types.new.ts
--
-- ROLLBACK (destroys all staged imports; published content is unaffected):
--   DROP FUNCTION IF EXISTS public.publish_import_item(uuid,uuid,text,timestamptz,jsonb,text[]);
--   DROP TABLE IF EXISTS content_import_items;
--   DROP TABLE IF EXISTS content_imports;
--   DROP FUNCTION IF EXISTS public.content_import_items_freeze();
--   ALTER TABLE exhibitions DROP COLUMN IF EXISTS entry_kind;
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. PREFLIGHT — runs BEFORE BEGIN so it can stop an unsafe apply outright
-- ---------------------------------------------------------------------------
-- Verifies every dependency this migration assumes. If any RAISE EXCEPTION
-- fires, nothing below has run yet and the database is untouched.

DO $preflight$
BEGIN
  IF to_regclass('public.exhibitions') IS NULL THEN
    RAISE EXCEPTION 'preflight: exhibitions table missing';
  END IF;
  IF to_regclass('public.press') IS NULL THEN
    RAISE EXCEPTION 'preflight: press table missing';
  END IF;
  IF to_regclass('public.admins') IS NULL THEN
    RAISE EXCEPTION 'preflight: admins table missing — run 2026-05-22-admins-and-rls-refactor.sql first';
  END IF;
  IF to_regclass('public.activity_log') IS NULL THEN
    RAISE EXCEPTION 'preflight: activity_log table missing';
  END IF;
  IF to_regproc('public.is_admin') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.is_admin(uuid) missing — run 2026-05-22-admins-and-rls-refactor.sql first';
  END IF;
  IF to_regproc('public.update_updated_at_column') IS NULL THEN
    RAISE EXCEPTION 'preflight: update_updated_at_column() missing';
  END IF;

  -- The publish RPC writes these by name; a missing one would only surface at
  -- runtime as a failed publish, so assert them here instead.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='exhibitions' AND column_name='slug') THEN
    RAISE EXCEPTION 'preflight: exhibitions.slug missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='exhibitions' AND column_name='exhibition_url') THEN
    RAISE EXCEPTION 'preflight: exhibitions.exhibition_url missing — run 2026-04-04-exhibition-url.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='press' AND column_name='slug') THEN
    RAISE EXCEPTION 'preflight: press.slug missing';
  END IF;

  RAISE NOTICE 'preflight: OK';
END
$preflight$;


BEGIN;

-- ---------------------------------------------------------------------------
-- 1. exhibitions.entry_kind — additive, safe default
-- ---------------------------------------------------------------------------
-- NOT exhibition_type. That column holds TEMPORAL state (past/current/upcoming)
-- and is consumed as an object key (statusStyles[...]) and an i18n key
-- (t('status.<value>')) on the public site. Adding 'screening' there would
-- render an undefined className, a blank badge, and a missing-key error — and
-- is semantically wrong, since a screening is ALSO past or upcoming.

ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS entry_kind text NOT NULL DEFAULT 'exhibition';

ALTER TABLE exhibitions DROP CONSTRAINT IF EXISTS exhibitions_entry_kind_check;
ALTER TABLE exhibitions ADD CONSTRAINT exhibitions_entry_kind_check
  CHECK (entry_kind IN ('exhibition','screening','talk','event'));

CREATE INDEX IF NOT EXISTS idx_exhibitions_entry_kind ON exhibitions(entry_kind);

COMMENT ON COLUMN exhibitions.entry_kind IS
  'What KIND of entry this is. Orthogonal to exhibition_type, which is temporal '
  '(past/current/upcoming). Existing rows default to ''exhibition''. Rendered as '
  'a secondary badge with its own style map and i18n keys (entryKind.*), never '
  'merged into the temporal statusStyles lookup.';


-- ---------------------------------------------------------------------------
-- 2. content_imports — one row per pasted block
-- ---------------------------------------------------------------------------
-- status covers ONLY the parse lifecycle. Publish progress is DERIVED from
-- item counts at read time and never stored, so it cannot drift.

CREATE TABLE IF NOT EXISTS content_imports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text          text NOT NULL,
  source_label      text,
  status            text NOT NULL DEFAULT 'parsing',
  archived_at       timestamptz,
  error_message     text,

  -- created_by is the authoritative actor; email is a display snapshot only,
  -- because email addresses change and are not a stable identity.
  created_by        uuid REFERENCES admins(user_id) ON DELETE SET NULL,
  created_by_email  text,

  model             text,
  prompt_version    text,
  chunk_count       integer NOT NULL DEFAULT 0,
  input_tokens      integer NOT NULL DEFAULT 0,
  output_tokens     integer NOT NULL DEFAULT 0,
  latency_ms        integer NOT NULL DEFAULT 0,
  cost_usd          numeric(10,4) NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT content_imports_status_check
    CHECK (status IN ('parsing','ready','failed')),
  CONSTRAINT content_imports_raw_text_len
    CHECK (char_length(raw_text) <= 40000),
  CONSTRAINT content_imports_source_label_len
    CHECK (source_label IS NULL OR char_length(source_label) <= 200),
  CONSTRAINT content_imports_error_len
    CHECK (error_message IS NULL OR char_length(error_message) <= 4000),
  CONSTRAINT content_imports_nonneg
    CHECK (chunk_count >= 0 AND input_tokens >= 0 AND output_tokens >= 0
           AND latency_ms >= 0 AND cost_usd >= 0)
);

COMMENT ON TABLE content_imports IS
  'One row per raw text block pasted into /admin/import. status tracks only the '
  'PARSE lifecycle (parsing|ready|failed); publish progress is derived from '
  'content_import_items counts at read time so it can never drift. item_count is '
  'deliberately NOT stored for the same reason.';
COMMENT ON COLUMN content_imports.archived_at IS
  'Set instead of hard DELETE once any item has published, so publishing '
  'provenance survives. Default listing filters archived_at IS NULL.';


-- ---------------------------------------------------------------------------
-- 3. content_import_items — one row per detected entry
-- ---------------------------------------------------------------------------
-- Snapshots, not FKs, carry the invariants. A published item MUST retain a
-- published_snapshot; the FK is advisory and ON DELETE SET NULL. If the CHECK
-- referenced the FK instead, deleting a target would violate it and the DELETE
-- would fail outright.

CREATE TABLE IF NOT EXISTS content_import_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id                uuid NOT NULL REFERENCES content_imports(id) ON DELETE CASCADE,
  source_index             integer NOT NULL,
  source_text              text NOT NULL,

  target_type              text NOT NULL,
  entry_kind               text,

  parsed_data              jsonb NOT NULL,   -- immutable, trigger-enforced
  edited_data              jsonb,
  apply_mask               text[] NOT NULL DEFAULT '{}',
  reviewed_at              timestamptz,      -- live-update approval gate

  confidence               numeric(3,2),
  warnings                 jsonb NOT NULL DEFAULT '[]'::jsonb,

  match_exhibition_id      uuid REFERENCES exhibitions(id) ON DELETE SET NULL,
  match_press_id           uuid REFERENCES press(id)       ON DELETE SET NULL,
  match_target_updated_at  timestamptz,
  match_confidence         numeric(3,2),
  match_summary            jsonb,
  match_snapshot           jsonb,

  action                   text NOT NULL DEFAULT 'create',
  status                   text NOT NULL DEFAULT 'pending',
  error_message            text,

  published_exhibition_id  uuid REFERENCES exhibitions(id) ON DELETE SET NULL,
  published_press_id       uuid REFERENCES press(id)       ON DELETE SET NULL,
  published_snapshot       jsonb,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cii_unique_source UNIQUE (import_id, source_index),

  CONSTRAINT cii_target_type_check
    CHECK (target_type IN ('exhibition','press')),
  CONSTRAINT cii_action_check
    CHECK (action IN ('create','update','skip')),
  CONSTRAINT cii_status_check
    CHECK (status IN ('pending','publishing','published','failed','skipped','parse_failed')),

  -- entry_kind is meaningful only for exhibition targets
  CONSTRAINT cii_entry_kind_check
    CHECK (
      (target_type = 'exhibition' AND entry_kind IN ('exhibition','screening','talk','event'))
      OR (target_type <> 'exhibition' AND entry_kind IS NULL)
    ),

  -- an update must know what it is updating
  CONSTRAINT cii_update_needs_match
    CHECK (action <> 'update' OR match_snapshot IS NOT NULL),

  -- a published item must retain durable proof of what it wrote
  CONSTRAINT cii_published_needs_snapshot
    CHECK (status <> 'published' OR published_snapshot IS NOT NULL),

  -- at most one FK per pair, and it must agree with target_type
  CONSTRAINT cii_match_fk_shape
    CHECK (
      (match_exhibition_id IS NULL OR target_type = 'exhibition')
      AND (match_press_id IS NULL OR target_type = 'press')
      AND NOT (match_exhibition_id IS NOT NULL AND match_press_id IS NOT NULL)
    ),
  CONSTRAINT cii_published_fk_shape
    CHECK (
      (published_exhibition_id IS NULL OR target_type = 'exhibition')
      AND (published_press_id IS NULL OR target_type = 'press')
      AND NOT (published_exhibition_id IS NOT NULL AND published_press_id IS NOT NULL)
    ),

  CONSTRAINT cii_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT cii_match_confidence_range
    CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1)),
  CONSTRAINT cii_source_index_nonneg
    CHECK (source_index >= 0),
  CONSTRAINT cii_source_text_len
    CHECK (char_length(source_text) <= 40000),
  CONSTRAINT cii_error_len
    CHECK (error_message IS NULL OR char_length(error_message) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_cii_import       ON content_import_items(import_id);
CREATE INDEX IF NOT EXISTS idx_cii_import_status ON content_import_items(import_id, status);
CREATE INDEX IF NOT EXISTS idx_ci_status_created ON content_imports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_archived       ON content_imports(archived_at) WHERE archived_at IS NULL;

COMMENT ON TABLE content_import_items IS
  'One reviewable record per entry detected in a paste. parsed_data is the '
  'immutable model output; edited_data holds admin corrections; effective value '
  'is coalesce(edited_data, parsed_data) per field.';
COMMENT ON COLUMN content_import_items.apply_mask IS
  'Field names approved for writing on an update. text[] (not jsonb) so unknown '
  'keys are rejected against a per-target enum at the boundary. Reset whenever '
  'target_type changes or the item is rematched.';
COMMENT ON COLUMN content_import_items.reviewed_at IS
  'Set only after an admin opens the diff of an item matching a PUBLISHED '
  'target. Publishing such an item without this is rejected server-side — the '
  'gate is not UI-only.';
COMMENT ON COLUMN content_import_items.published_snapshot IS
  'Durable audit record {id,type,title,slug,applied_fields,before,after}. The '
  'published CHECK references THIS, not the FK, so deleting a target degrades '
  'the join without destroying the audit trail or blocking the delete.';


-- ---------------------------------------------------------------------------
-- 4. Immutability trigger for parsed_data / source_text
-- ---------------------------------------------------------------------------
-- Calling these "immutable" in a doc is only a convention. Enforce it.

CREATE OR REPLACE FUNCTION public.content_import_items_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.parsed_data IS DISTINCT FROM OLD.parsed_data THEN
    RAISE EXCEPTION 'content_import_items.parsed_data is immutable (item %)', OLD.id;
  END IF;
  IF NEW.source_text IS DISTINCT FROM OLD.source_text THEN
    RAISE EXCEPTION 'content_import_items.source_text is immutable (item %)', OLD.id;
  END IF;
  IF NEW.import_id IS DISTINCT FROM OLD.import_id THEN
    RAISE EXCEPTION 'content_import_items.import_id is immutable (item %)', OLD.id;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_cii_freeze ON content_import_items;
CREATE TRIGGER trg_cii_freeze
  BEFORE UPDATE ON content_import_items
  FOR EACH ROW EXECUTE FUNCTION public.content_import_items_freeze();

DROP TRIGGER IF EXISTS trg_ci_updated_at ON content_imports;
CREATE TRIGGER trg_ci_updated_at
  BEFORE UPDATE ON content_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cii_updated_at ON content_import_items;
CREATE TRIGGER trg_cii_updated_at
  BEFORE UPDATE ON content_import_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ---------------------------------------------------------------------------
-- 5. RLS — admin only, both tables
-- ---------------------------------------------------------------------------
-- NOTE: do NOT use the legacy `auth.role() = 'authenticated'` style here.
-- Non-admin Founders Circle members share the same auth.users pool, so that
-- predicate would grant them access to every staged import.

ALTER TABLE content_imports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_import_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_imports_admin_all ON content_imports;
CREATE POLICY content_imports_admin_all ON content_imports
  FOR ALL USING (public.is_admin(auth.uid()))
          WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS content_import_items_admin_all ON content_import_items;
CREATE POLICY content_import_items_admin_all ON content_import_items
  FOR ALL USING (public.is_admin(auth.uid()))
          WITH CHECK (public.is_admin(auth.uid()));

-- No public, anon, or founder policy. Deliberate.


-- ---------------------------------------------------------------------------
-- 6. publish_import_item() — atomic, idempotent, per-item
-- ---------------------------------------------------------------------------
-- BOUNDARY: this function does NOT map, validate with zod, generate slugs, or
-- geocode — a Postgres function cannot call TypeScript. The route does all of
-- that and hands over a flat, already-validated payload. This function owns
-- exactly the parts that must be atomic: authorization, allowlist re-check,
-- the claim, the staleness check, the write, the state transition, and audit.
--
-- Returns jsonb; never raises for expected failures.
--   {ok:true,  code:'PUBLISHED',        entity_id:uuid}
--   {ok:false, code:'FORBIDDEN'}                       -- actor not an admin
--   {ok:false, code:'DISALLOWED_FIELD', field:text}    -- payload key off-allowlist
--   {ok:false, code:'ALREADY_CLAIMED'}                 -- concurrent/duplicate publish
--   {ok:false, code:'NOT_UPDATABLE'}                   -- mask tried to move slug/status
--   {ok:false, code:'STALE_TARGET'}                    -- target changed since matching
--   {ok:false, code:'WRITE_FAILED',     message:text}
--
-- SECURITY: called through the service-role client, so RLS does NOT apply.
-- requireAdmin() in the route is necessary but not sufficient — p_actor is
-- therefore validated here with is_admin() and cannot be spoofed past this
-- function. search_path is pinned and every reference is schema-qualified.

CREATE OR REPLACE FUNCTION public.publish_import_item(
  p_item_id             uuid,
  p_actor               uuid,
  p_target_type         text,
  p_expected_updated_at timestamptz,
  p_payload             jsonb,
  p_apply_mask          text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item            public.content_import_items%ROWTYPE;
  v_allowed         text[];
  v_fields          text[];
  v_key             text;
  v_entity_id       uuid;
  v_actual_updated  timestamptz;
  v_actor_email     text;
  v_before          jsonb;
  v_after           jsonb;
  v_title           text;
  v_slug            text;
  v_was_live        boolean := false;
  v_set_clause      text;
  v_col_clause      text;
  v_val_clause      text;
BEGIN
  -- 6.1 Authorization. Service-role bypasses RLS, so this is the real gate.
  IF p_actor IS NULL OR NOT public.is_admin(p_actor) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  SELECT email INTO v_actor_email FROM public.admins WHERE user_id = p_actor;

  -- 6.2 Field allowlist, re-enforced at the database boundary.
  -- The route already validated, but application JSON is untrusted here.
  IF p_target_type = 'exhibition' THEN
    v_allowed := ARRAY[
      'title','slug','venue','street_address','city','state_region','postal_code',
      'country','start_date','end_date','description','image_url',
      'thumbnail_image_url','exhibition_type','entry_kind','location_lat',
      'location_lng','venue_url','venue_description','exhibition_url',
      'status','meta_title','meta_description'
    ];
  ELSIF p_target_type = 'press' THEN
    v_allowed := ARRAY[
      'title','slug','publication','author','publish_date','url','excerpt',
      'image_url','press_type','is_featured','status','meta_title','meta_description'
    ];
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'DISALLOWED_FIELD', 'field', 'target_type');
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DISALLOWED_FIELD', 'field', v_key);
    END IF;
  END LOOP;

  -- 6.3 Claim. The conditional UPDATE *is* the claim — this is what makes
  -- publish idempotent under double-click, browser retry, or two admin
  -- sessions. Zero rows means someone else holds it or it already published.
  UPDATE public.content_import_items
     SET status = 'publishing'
   WHERE id = p_item_id
     AND status = 'pending'
  RETURNING * INTO v_item;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_CLAIMED');
  END IF;

  -- A skip should never reach publish (the route filters them), but if one did
  -- it would fall through to the create branch and silently insert. Release the
  -- claim and refuse instead.
  IF v_item.action = 'skip' THEN
    UPDATE public.content_import_items SET status = 'pending' WHERE id = p_item_id;
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_UPDATABLE', 'message', 'Item action is skip');
  END IF;


  -- Everything from here is wrapped so a failure can PERSIST as 'failed'.
  -- Without the nested block, a raised exception would roll back the status
  -- write along with the target write and leave the item stuck at 'pending',
  -- silently breaking the retry state machine.
  BEGIN
    IF v_item.action = 'update' THEN
      -- 6.4 Staleness, checked inside the transaction.
      IF p_target_type = 'exhibition' THEN
        SELECT updated_at, to_jsonb(e.*), e.title, e.slug, (e.status = 'published')
          INTO v_actual_updated, v_before, v_title, v_slug, v_was_live
          FROM public.exhibitions e WHERE e.id = v_item.match_exhibition_id;
        v_entity_id := v_item.match_exhibition_id;
      ELSE
        SELECT updated_at, to_jsonb(p.*), p.title, p.slug, (p.status = 'published')
          INTO v_actual_updated, v_before, v_title, v_slug, v_was_live
          FROM public.press p WHERE p.id = v_item.match_press_id;
        v_entity_id := v_item.match_press_id;
      END IF;

      IF v_entity_id IS NULL OR v_actual_updated IS NULL THEN
        UPDATE public.content_import_items
           SET status = 'failed', error_message = 'Match target no longer exists'
         WHERE id = p_item_id;
        RETURN jsonb_build_object('ok', false, 'code', 'STALE_TARGET');
      END IF;

      -- A LIVE update requires an affirmative, per-item review. Enforced here
      -- as well as in the route, so the gate cannot be bypassed by calling the
      -- RPC directly. Draft targets keep the lighter flow — nothing they do is
      -- publicly visible. This check sits here because v_was_live is only
      -- known after the target is fetched.
      IF v_was_live AND v_item.reviewed_at IS NULL THEN
        UPDATE public.content_import_items SET status = 'pending' WHERE id = p_item_id;
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_REVIEWED');
      END IF;

      IF p_expected_updated_at IS NULL
         OR v_actual_updated IS DISTINCT FROM p_expected_updated_at THEN
        -- Normal return, not an exception: the human approved a diff that no
        -- longer describes reality. Requires Refresh match, not blind retry.
        UPDATE public.content_import_items
           SET status = 'failed', error_message = 'STALE_TARGET'
         WHERE id = p_item_id;
        RETURN jsonb_build_object('ok', false, 'code', 'STALE_TARGET');
      END IF;

      -- 6.5 An update writes ONLY mask-approved fields, and may never move
      -- slug or status: slug is stable identity, status is publication state.
      v_fields := ARRAY(
        SELECT k FROM unnest(p_apply_mask) AS k
         WHERE k = ANY (v_allowed)
           AND k NOT IN ('slug','status')
           AND jsonb_exists(p_payload, k)
      );

      IF array_length(v_fields, 1) IS NULL THEN
        UPDATE public.content_import_items
           SET status = 'failed', error_message = 'Apply mask selected no writable fields'
         WHERE id = p_item_id;
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_UPDATABLE');
      END IF;

      SELECT string_agg(format('%I = s.%I', k, k), ', ')
        INTO v_set_clause FROM unnest(v_fields) AS k;

      -- jsonb_populate_record casts each key to the column's real type, so
      -- dates/numerics/booleans land correctly instead of as jsonb.
      EXECUTE format(
        'UPDATE public.%I t SET %s FROM (SELECT (jsonb_populate_record(NULL::public.%I, $1)).*) s WHERE t.id = $2',
        CASE WHEN p_target_type = 'exhibition' THEN 'exhibitions' ELSE 'press' END,
        v_set_clause,
        CASE WHEN p_target_type = 'exhibition' THEN 'exhibitions' ELSE 'press' END
      ) USING p_payload, v_entity_id;

    ELSE
      -- 6.6 Create. Writes every supplied field; status/slug are server-derived
      -- upstream and arrive in the payload already.
      v_fields := ARRAY(SELECT k FROM unnest(v_allowed) AS k WHERE jsonb_exists(p_payload, k));

      -- An empty payload would render `INSERT INTO t () SELECT FROM ...`, which
      -- is a syntax error. Fail with a legible reason instead.
      IF array_length(v_fields, 1) IS NULL THEN
        UPDATE public.content_import_items
           SET status = 'failed', error_message = 'Payload contained no writable fields'
         WHERE id = p_item_id;
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_UPDATABLE');
      END IF;

      SELECT string_agg(format('%I', k), ', '), string_agg(format('s.%I', k), ', ')
        INTO v_col_clause, v_val_clause FROM unnest(v_fields) AS k;

      EXECUTE format(
        'INSERT INTO public.%I (%s) SELECT %s FROM (SELECT (jsonb_populate_record(NULL::public.%I, $1)).*) s RETURNING id',
        CASE WHEN p_target_type = 'exhibition' THEN 'exhibitions' ELSE 'press' END,
        v_col_clause, v_val_clause,
        CASE WHEN p_target_type = 'exhibition' THEN 'exhibitions' ELSE 'press' END
      ) USING p_payload INTO v_entity_id;

      v_before   := NULL;
      v_was_live := false;
    END IF;

    -- 6.7 Read back the written row for the durable snapshot.
    IF p_target_type = 'exhibition' THEN
      SELECT to_jsonb(e.*), e.title, e.slug INTO v_after, v_title, v_slug
        FROM public.exhibitions e WHERE e.id = v_entity_id;
    ELSE
      SELECT to_jsonb(p.*), p.title, p.slug INTO v_after, v_title, v_slug
        FROM public.press p WHERE p.id = v_entity_id;
    END IF;

    UPDATE public.content_import_items
       SET status                  = 'published',
           error_message           = NULL,
           published_exhibition_id = CASE WHEN p_target_type = 'exhibition' THEN v_entity_id END,
           published_press_id      = CASE WHEN p_target_type = 'press'      THEN v_entity_id END,
           published_snapshot      = jsonb_build_object(
             'id',              v_entity_id,
             'type',            p_target_type,
             'title',           v_title,
             'slug',            v_slug,
             'applied_fields',  to_jsonb(v_fields),
             'before',          v_before,
             'after',           v_after,
             'was_live',        v_was_live
           )
     WHERE id = p_item_id;

    -- 6.8 Audit, INSIDE this transaction. Writing it from the route after the
    -- RPC returned would lose the record if the route died in between, and
    -- logActivity() deliberately swallows its own errors.
    INSERT INTO public.activity_log
      (user_email, action, entity_type, entity_id, entity_title, changes)
    VALUES (
      COALESCE(v_actor_email, 'unknown'),
      CASE WHEN v_item.action = 'update' THEN 'update' ELSE 'create' END,
      p_target_type,
      v_entity_id,
      v_title,
      jsonb_build_object(
        'source',          'smart_import',
        'import_id',       v_item.import_id,
        'import_item_id',  v_item.id,
        'applied_fields',  to_jsonb(v_fields),
        'was_live',        v_was_live,
        'before',          v_before,
        'after',           v_after
      )
    );

    RETURN jsonb_build_object('ok', true, 'code', 'PUBLISHED', 'entity_id', v_entity_id);

  EXCEPTION WHEN OTHERS THEN
    -- The implicit savepoint on this block rolls back the target write, then
    -- THIS update commits — so the failure is durable and retryable.
    UPDATE public.content_import_items
       SET status = 'failed', error_message = left(SQLERRM, 4000)
     WHERE id = p_item_id;
    RETURN jsonb_build_object('ok', false, 'code', 'WRITE_FAILED', 'message', SQLERRM);
  END;
END
$$;

REVOKE ALL ON FUNCTION public.publish_import_item(uuid,uuid,text,timestamptz,jsonb,text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_import_item(uuid,uuid,text,timestamptz,jsonb,text[])
  TO service_role;

COMMENT ON FUNCTION public.publish_import_item(uuid,uuid,text,timestamptz,jsonb,text[]) IS
  'Atomically publishes one content_import_item. Claim + write + transition + '
  'audit share one transaction, so a dead connection rolls the claim back to '
  'pending and no stuck-publishing state or lease machinery is needed. '
  'Validates p_actor with is_admin() because the service-role caller bypasses RLS.';

COMMIT;


-- ---------------------------------------------------------------------------
-- 7. POST-APPLY VERIFICATION — run this and read the output
-- ---------------------------------------------------------------------------
-- Expect: entry_kind present with every existing row defaulted to 'exhibition',
-- both tables present with RLS enabled, and the RPC granted to service_role only.

SELECT 'entry_kind backfill' AS check,
       entry_kind, count(*)
  FROM exhibitions GROUP BY entry_kind;

SELECT 'rls enabled' AS check, relname, relrowsecurity
  FROM pg_class
 WHERE relname IN ('content_imports','content_import_items');

SELECT 'rpc grants' AS check, grantee, privilege_type
  FROM information_schema.routine_privileges
 WHERE routine_name = 'publish_import_item';
