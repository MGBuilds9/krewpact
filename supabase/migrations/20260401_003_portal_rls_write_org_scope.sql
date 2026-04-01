-- Portal write-path org scoping
-- The existing RESTRICTIVE SELECT policies (from 20260302_002) protect reads.
-- This migration adds RESTRICTIVE INSERT/UPDATE policies to prevent cross-org writes.

BEGIN;

-- portal_accounts: internal staff can only INSERT for their own org
CREATE POLICY portal_accounts_org_restrict_insert ON portal_accounts
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY portal_accounts_org_restrict_update ON portal_accounts
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- portal_permissions: internal staff can only write permissions for their own org's accounts
CREATE POLICY portal_permissions_org_restrict_insert ON portal_permissions
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY portal_permissions_org_restrict_update ON portal_permissions
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- portal_messages: org-scope writes
CREATE POLICY portal_messages_org_restrict_insert ON portal_messages
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY portal_messages_org_restrict_update ON portal_messages
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- portal_view_logs: org-scope inserts (no update needed — insert-only table)
CREATE POLICY portal_view_logs_org_restrict_insert ON portal_view_logs
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

COMMIT;
