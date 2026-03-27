-- Migration: fix_portal_rls_jsonb_operators
-- Date: 2026-03-27
--
-- Problem:
--   The portal RLS policies were originally created in 20260227_portal_rls_policies.sql
--   using the legacy JWT path `public_metadata` with the text cast and regex operator:
--
--       (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|...'
--
--   Migration 20260311_001_migrate_jwt_claims_third_party_auth.sql updated the JWT path to
--   `metadata` / `role_keys` (Clerk Third-Party Auth), but still used the text regex operator:
--
--       (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|...'
--
-- Why this is wrong:
--   `->>` extracts the JSONB value as TEXT. When `role_keys` is a JSON array like
--   ["platform_admin","project_manager"], the text representation is the raw JSON string.
--   A regex match on that works by accident today but is fragile and bypasses proper JSONB
--   semantics — a role value like "platform_admin_v2" would falsely match "platform_admin".
--
-- Fix:
--   Use `->` (returns JSONB) + `?|` (JSONB array contains any of the given keys/elements):
--
--       (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', ...]
--
--   This is semantically correct: it checks whether any element in the `role_keys` JSONB
--   array exactly matches one of the listed role strings.
--
-- Scope: 10 portal policies across 4 tables.
--   - portal_accounts      (3 policies)
--   - portal_messages      (3 policies)
--   - portal_permissions   (3 policies)
--   - portal_view_logs     (1 policy)

BEGIN;

-- ============================================================
-- portal_accounts
-- ============================================================

DROP POLICY IF EXISTS "portal_accounts_self_or_internal" ON portal_accounts;
CREATE POLICY "portal_accounts_self_or_internal" ON portal_accounts
  FOR SELECT USING (
    -- The portal user themselves (matched by their Clerk sub)
    clerk_user_id = (auth.jwt() ->> 'sub')
    -- Internal staff: proper JSONB array membership check
    OR (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator', 'operations_manager']
  );

DROP POLICY IF EXISTS "portal_accounts_internal_insert" ON portal_accounts;
CREATE POLICY "portal_accounts_internal_insert" ON portal_accounts
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
  );

DROP POLICY IF EXISTS "portal_accounts_internal_update" ON portal_accounts;
CREATE POLICY "portal_accounts_internal_update" ON portal_accounts
  FOR UPDATE USING (
    (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
    -- Allow a portal user to update their own account (for onboarding)
    OR clerk_user_id = (auth.jwt() ->> 'sub')
  );

-- ============================================================
-- portal_messages
-- ============================================================

DROP POLICY IF EXISTS "portal_messages_scoped" ON portal_messages;
CREATE POLICY "portal_messages_scoped" ON portal_messages
  FOR SELECT USING (
    -- The portal account owner
    portal_account_id IN (
      SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    -- Internal sender
    OR sender_user_id IN (
      SELECT id FROM users WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    -- Broadcast messages (portal_account_id IS NULL = announcement to all)
    OR portal_account_id IS NULL
    -- Internal staff with management roles
    OR (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
  );

DROP POLICY IF EXISTS "portal_messages_portal_insert" ON portal_messages;
CREATE POLICY "portal_messages_portal_insert" ON portal_messages
  FOR INSERT WITH CHECK (
    -- Portal users can only insert inbound messages for their own account
    (
      direction = 'inbound'
      AND portal_account_id IN (
        SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
      )
    )
    -- Internal staff can insert outbound messages
    OR (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
  );

DROP POLICY IF EXISTS "portal_messages_mark_read" ON portal_messages;
CREATE POLICY "portal_messages_mark_read" ON portal_messages
  FOR UPDATE USING (
    portal_account_id IN (
      SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    OR (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager']
  )
  WITH CHECK (true);

-- ============================================================
-- portal_permissions
-- ============================================================

DROP POLICY IF EXISTS "portal_permissions_scoped" ON portal_permissions;
CREATE POLICY "portal_permissions_scoped" ON portal_permissions
  FOR SELECT USING (
    portal_account_id IN (
      SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    OR (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
  );

DROP POLICY IF EXISTS "portal_permissions_internal_write" ON portal_permissions;
CREATE POLICY "portal_permissions_internal_write" ON portal_permissions
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
  );

DROP POLICY IF EXISTS "portal_permissions_internal_update" ON portal_permissions;
CREATE POLICY "portal_permissions_internal_update" ON portal_permissions
  FOR UPDATE USING (
    (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager', 'project_coordinator']
  );

-- ============================================================
-- portal_view_logs
-- ============================================================

DROP POLICY IF EXISTS "portal_view_logs_admin_read" ON portal_view_logs;
CREATE POLICY "portal_view_logs_admin_read" ON portal_view_logs
  FOR SELECT USING (
    (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'project_manager']
  );

COMMIT;
