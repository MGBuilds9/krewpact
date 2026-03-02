-- KrewPact Multi-Tenant RLS
-- Purpose: org-scoped RLS + helper function for org_id claim

BEGIN;

-- Helper: org id from JWT
CREATE OR REPLACE FUNCTION public.krewpact_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'krewpact_org_id',
    (SELECT id::text FROM organizations WHERE slug = 'default' LIMIT 1),
    ''
  );
$$;

-- Organizations + settings RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- orgs: platform admin only
CREATE POLICY organizations_select ON organizations
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY organizations_insert ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY organizations_update ON organizations
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
CREATE POLICY organizations_delete ON organizations
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- org_settings: platform admin only
CREATE POLICY org_settings_select ON org_settings
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY org_settings_insert ON org_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY org_settings_update ON org_settings
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Restrictive org policy applied to all org-bound tables
-- Note: Restrictive policies are ANDed with existing permissive policies.

-- Divisions
CREATE POLICY divisions_org_restrict ON divisions
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- Core CRM
CREATE POLICY accounts_org_restrict ON accounts
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY contacts_org_restrict ON contacts
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY leads_org_restrict ON leads
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY opportunities_org_restrict ON opportunities
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY activities_org_restrict ON activities
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- Estimating
CREATE POLICY estimates_org_restrict ON estimates
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY estimate_lines_org_restrict ON estimate_lines
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY estimate_versions_org_restrict ON estimate_versions
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- Projects
CREATE POLICY projects_org_restrict ON projects
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY project_members_org_restrict ON project_members
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY milestones_org_restrict ON milestones
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY tasks_org_restrict ON tasks
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY task_comments_org_restrict ON task_comments
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY project_daily_logs_org_restrict ON project_daily_logs
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- Expenses + Notifications
CREATE POLICY expense_claims_org_restrict ON expense_claims
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY notifications_org_restrict ON notifications
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY notification_preferences_org_restrict ON notification_preferences
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- ERP
CREATE POLICY erp_sync_map_org_restrict ON erp_sync_map
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY erp_sync_jobs_org_restrict ON erp_sync_jobs
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY erp_sync_events_org_restrict ON erp_sync_events
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY erp_sync_errors_org_restrict ON erp_sync_errors
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- Portals
CREATE POLICY portal_accounts_org_restrict ON portal_accounts
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY portal_permissions_org_restrict ON portal_permissions
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY portal_messages_org_restrict ON portal_messages
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());
CREATE POLICY portal_view_logs_org_restrict ON portal_view_logs
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

COMMIT;
