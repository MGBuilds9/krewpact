-- KrewPact CRM + Operations RLS Policies
-- Purpose: Row-Level Security for all tables created in 00003_crm_operations.sql
-- Depends on: 00002_rls_policies.sql (helper functions: krewpact_user_id, krewpact_divisions, krewpact_roles, is_platform_admin)
--
-- Policy patterns:
--   1. Division-scoped: CRM + Estimating tables — user sees rows in their JWT divisions
--   2. Project-member: Project tables — user must be a member of the project
--   3. User-owned: Expenses, notifications — user sees only their own rows
--   4. Admin-only: ERP sync tables — platform_admin + operations_manager

BEGIN;

-- =========================
-- ENABLE RLS (deny-by-default)
-- =========================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_errors ENABLE ROW LEVEL SECURITY;

-- =========================
-- ACCOUNTS: Division-scoped
-- =========================
CREATE POLICY accounts_select ON accounts
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY accounts_insert ON accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY accounts_update ON accounts
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY accounts_delete ON accounts
  FOR DELETE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

-- =========================
-- CONTACTS: Inherit access from parent account's division
-- Contacts without an account are visible to all authenticated (orphaned contacts)
-- =========================
CREATE POLICY contacts_select ON contacts
  FOR SELECT TO authenticated
  USING (
    account_id IS NULL
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY contacts_insert ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    account_id IS NULL
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY contacts_update ON contacts
  FOR UPDATE TO authenticated
  USING (
    account_id IS NULL
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    account_id IS NULL
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY contacts_delete ON contacts
  FOR DELETE TO authenticated
  USING (
    account_id IS NULL
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- =========================
-- LEADS: Division-scoped
-- =========================
CREATE POLICY leads_select ON leads
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY leads_insert ON leads
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY leads_update ON leads
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY leads_delete ON leads
  FOR DELETE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

-- =========================
-- OPPORTUNITIES: Division-scoped
-- =========================
CREATE POLICY opportunities_select ON opportunities
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY opportunities_insert ON opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY opportunities_update ON opportunities
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY opportunities_delete ON opportunities
  FOR DELETE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

-- =========================
-- OPPORTUNITY_STAGE_HISTORY: Inherit from parent opportunity's division
-- =========================
CREATE POLICY opp_stage_history_select ON opportunity_stage_history
  FOR SELECT TO authenticated
  USING (
    opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY opp_stage_history_insert ON opportunity_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (
    opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- No update/delete on stage history (immutable audit trail)

-- =========================
-- ACTIVITIES: Access if user can access ANY linked entity's division
-- Activities link to opportunities, leads, accounts, or contacts
-- =========================
CREATE POLICY activities_select ON activities
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR contact_id IN (
      SELECT id FROM contacts
      WHERE account_id IN (
        SELECT id FROM accounts
        WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
      )
    )
  );

CREATE POLICY activities_insert ON activities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR contact_id IN (
      SELECT id FROM contacts
      WHERE account_id IN (
        SELECT id FROM accounts
        WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
      )
    )
  );

CREATE POLICY activities_update ON activities
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY activities_delete ON activities
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR opportunity_id IN (
      SELECT id FROM opportunities
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR account_id IN (
      SELECT id FROM accounts
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

-- =========================
-- ESTIMATES: Division-scoped
-- =========================
CREATE POLICY estimates_select ON estimates
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY estimates_insert ON estimates
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY estimates_update ON estimates
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY estimates_delete ON estimates
  FOR DELETE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

-- =========================
-- ESTIMATE_LINES: Inherit from parent estimate's division
-- =========================
CREATE POLICY estimate_lines_select ON estimate_lines
  FOR SELECT TO authenticated
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_lines_insert ON estimate_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_lines_update ON estimate_lines
  FOR UPDATE TO authenticated
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_lines_delete ON estimate_lines
  FOR DELETE TO authenticated
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- =========================
-- ESTIMATE_VERSIONS: Inherit from parent estimate's division
-- =========================
CREATE POLICY estimate_versions_select ON estimate_versions
  FOR SELECT TO authenticated
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_versions_insert ON estimate_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- No update/delete on estimate versions (immutable snapshots)

-- =========================
-- PROJECTS: Division-scoped + member access
-- Members can SELECT, project_manager+ can INSERT/UPDATE, platform_admin manages all
-- =========================
CREATE POLICY projects_select ON projects
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR id IN (
      SELECT project_id FROM project_members
      WHERE user_id::text = public.krewpact_user_id()
    )
  );

CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY projects_update ON projects
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY projects_delete ON projects
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- =========================
-- PROJECT_MEMBERS: project-scoped
-- Members can see their own project memberships, PM+ can manage, admin manages all
-- =========================
CREATE POLICY project_members_select ON project_members
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id::text = public.krewpact_user_id()
    )
  );

CREATE POLICY project_members_insert ON project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY project_members_update ON project_members
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY project_members_delete ON project_members
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

-- =========================
-- MILESTONES: project member can SELECT, division user can modify
-- =========================
CREATE POLICY milestones_select ON milestones
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id::text = public.krewpact_user_id()
    )
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY milestones_insert ON milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY milestones_update ON milestones
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY milestones_delete ON milestones
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

-- =========================
-- TASKS: project member can SELECT, division user can modify
-- =========================
CREATE POLICY tasks_select ON tasks
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id::text = public.krewpact_user_id()
    )
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

-- =========================
-- TASK_COMMENTS: inherit from parent task's project
-- =========================
CREATE POLICY task_comments_select ON task_comments
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR task_id IN (
      SELECT id FROM tasks
      WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id::text = public.krewpact_user_id()
      )
    )
    OR task_id IN (
      SELECT id FROM tasks
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
      )
    )
  );

CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR task_id IN (
      SELECT id FROM tasks
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
      )
    )
  );

CREATE POLICY task_comments_update ON task_comments
  FOR UPDATE TO authenticated
  USING (
    author_user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    author_user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY task_comments_delete ON task_comments
  FOR DELETE TO authenticated
  USING (
    author_user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

-- =========================
-- PROJECT_DAILY_LOGS: inherit from parent project
-- =========================
CREATE POLICY daily_logs_select ON project_daily_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id::text = public.krewpact_user_id()
    )
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY daily_logs_insert ON project_daily_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR project_id IN (
      SELECT id FROM projects
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
  );

CREATE POLICY daily_logs_update ON project_daily_logs
  FOR UPDATE TO authenticated
  USING (
    submitted_by::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    submitted_by::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY daily_logs_delete ON project_daily_logs
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- =========================
-- EXPENSE_CLAIMS: User-owned + accounting/admin visibility
-- =========================
CREATE POLICY expense_claims_select ON expense_claims
  FOR SELECT TO authenticated
  USING (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
    OR public.krewpact_roles() ? 'accounting'
  );

CREATE POLICY expense_claims_insert ON expense_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY expense_claims_update ON expense_claims
  FOR UPDATE TO authenticated
  USING (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY expense_claims_delete ON expense_claims
  FOR DELETE TO authenticated
  USING (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

-- =========================
-- NOTIFICATIONS: User-owned only (strictly scoped, even admin only sees their own)
-- =========================
CREATE POLICY notifications_select ON notifications
  FOR SELECT TO authenticated
  USING (user_id::text = public.krewpact_user_id());

CREATE POLICY notifications_update ON notifications
  FOR UPDATE TO authenticated
  USING (user_id::text = public.krewpact_user_id())
  WITH CHECK (user_id::text = public.krewpact_user_id());

CREATE POLICY notifications_insert ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY notifications_delete ON notifications
  FOR DELETE TO authenticated
  USING (user_id::text = public.krewpact_user_id());

-- =========================
-- NOTIFICATION_PREFERENCES: User-owned only
-- =========================
CREATE POLICY notif_prefs_select ON notification_preferences
  FOR SELECT TO authenticated
  USING (user_id::text = public.krewpact_user_id());

CREATE POLICY notif_prefs_insert ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = public.krewpact_user_id());

CREATE POLICY notif_prefs_update ON notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id::text = public.krewpact_user_id())
  WITH CHECK (user_id::text = public.krewpact_user_id());

CREATE POLICY notif_prefs_delete ON notification_preferences
  FOR DELETE TO authenticated
  USING (user_id::text = public.krewpact_user_id());

-- =========================
-- ERP SYNC TABLES: platform_admin + operations_manager only
-- =========================

-- erp_sync_map
CREATE POLICY erp_sync_map_select ON erp_sync_map
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_map_insert ON erp_sync_map
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_map_update ON erp_sync_map
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_map_delete ON erp_sync_map
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- erp_sync_jobs
CREATE POLICY erp_sync_jobs_select ON erp_sync_jobs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_jobs_insert ON erp_sync_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_jobs_update ON erp_sync_jobs
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_jobs_delete ON erp_sync_jobs
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- erp_sync_events
CREATE POLICY erp_sync_events_select ON erp_sync_events
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_events_insert ON erp_sync_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- No update/delete on sync events (immutable log)

-- erp_sync_errors
CREATE POLICY erp_sync_errors_select ON erp_sync_errors
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY erp_sync_errors_insert ON erp_sync_errors
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- No update/delete on sync errors (immutable log)

COMMIT;
