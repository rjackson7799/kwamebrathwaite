-- ============================================================================
-- Grant admin access to krbrathwaite@gmail.com
-- ============================================================================
-- The user already exists in auth.users (UID cbf37c8f-afff-442b-a9f2-99cc6ff19a63);
-- this adds their membership row to `admins`, which is what is_admin() and all
-- /admin RLS + route guards check (see middleware.ts and the per-route check in
-- app/api/admin/auth/login/route.ts). Being a Supabase Auth user is not enough
-- on its own.
--
-- Selecting id/email straight from auth.users (rather than hardcoding the UID)
-- guarantees the foreign key is correct and stores the email with the exact
-- casing Auth holds — the app looks admins up with a lowercased email
-- (lib/auth/admins-admin.ts). ON CONFLICT makes this safe to re-run.
--
-- Insert is service-role only (no client RLS policies), so run this in the
-- Supabase SQL editor on the target project.
-- ============================================================================

BEGIN;

INSERT INTO admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'krbrathwaite@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- Verify (run separately):
--   SELECT user_id, email, created_at FROM admins WHERE email = 'krbrathwaite@gmail.com';
--   SELECT public.is_admin('cbf37c8f-afff-442b-a9f2-99cc6ff19a63');  -- expect: true
