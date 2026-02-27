-- Migration: portal_rls_policies
-- Row-Level Security policies for portal_accounts, portal_permissions, portal_messages, portal_view_logs

-- ============================================================
-- portal_accounts
-- ============================================================
ALTER TABLE portal_accounts ENABLE ROW LEVEL SECURITY;

-- Account holders can see only their own record; internal staff (admin/manager/coordinator) see all
CREATE POLICY portal_accounts_self_or_internal ON portal_accounts
  FOR SELECT USING (
    -- The portal user themselves (matched by their Clerk sub)
    clerk_user_id = (auth.jwt() ->> 'sub')
    -- Internal staff roles (stored in public_metadata by Clerk)
    OR (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator|operations_manager'
  );

-- Only internal staff can insert (invite flow)
CREATE POLICY portal_accounts_internal_insert ON portal_accounts
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
  );

-- Only internal staff can update portal accounts
CREATE POLICY portal_accounts_internal_update ON portal_accounts
  FOR UPDATE USING (
    (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
    -- Allow a portal user to update their own account (for onboarding)
    OR clerk_user_id = (auth.jwt() ->> 'sub')
  );

-- ============================================================
-- portal_permissions
-- ============================================================
ALTER TABLE portal_permissions ENABLE ROW LEVEL SECURITY;

-- Portal users see only their own permissions; internal staff see all
CREATE POLICY portal_permissions_scoped ON portal_permissions
  FOR SELECT USING (
    portal_account_id IN (
      SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    OR (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
  );

-- Only internal staff can insert/update permissions
CREATE POLICY portal_permissions_internal_write ON portal_permissions
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
  );

CREATE POLICY portal_permissions_internal_update ON portal_permissions
  FOR UPDATE USING (
    (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
  );

-- ============================================================
-- portal_messages
-- ============================================================
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;

-- Portal users see messages for their own account; internal staff see all for their projects
CREATE POLICY portal_messages_scoped ON portal_messages
  FOR SELECT USING (
    -- The portal account owner
    portal_account_id IN (
      SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    -- Internal sender
    OR sender_user_id IN (
      SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
    -- Broadcast messages (portal_account_id IS NULL = announcement to all)
    OR portal_account_id IS NULL
    -- Internal staff with management roles
    OR (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
  );

-- Portal users can insert inbound messages (their own replies)
CREATE POLICY portal_messages_portal_insert ON portal_messages
  FOR INSERT WITH CHECK (
    -- Portal users can only insert inbound messages for their own account
    (
      direction = 'inbound'
      AND portal_account_id IN (
        SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
      )
    )
    -- Internal staff can insert outbound messages
    OR (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager|project_coordinator'
  );

-- Portal users can mark their own messages as read
CREATE POLICY portal_messages_mark_read ON portal_messages
  FOR UPDATE USING (
    portal_account_id IN (
      SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
    OR (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager'
  )
  WITH CHECK (true);

-- ============================================================
-- portal_view_logs
-- ============================================================
ALTER TABLE portal_view_logs ENABLE ROW LEVEL SECURITY;

-- Insert-only for portal users; admins/managers can read
CREATE POLICY portal_view_logs_insert ON portal_view_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY portal_view_logs_admin_read ON portal_view_logs
  FOR SELECT USING (
    (auth.jwt() -> 'public_metadata' ->> 'krewpact_roles')::text ~ 'platform_admin|project_manager'
  );
