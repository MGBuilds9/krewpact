-- KrewPact Migration: Sales AGI RLS Lockdown
-- Purpose: Replace permissive USING(true) policies on Sales AGI tables with proper
--          division-scoped + role-based policies matching the pattern in 00004_crm_rls_policies.sql
-- Depends on: 20260212210000_sales_agi.sql, 00002_rls_policies.sql (helper functions)

BEGIN;

-- =========================
-- DROP PERMISSIVE POLICIES
-- =========================
-- These were created in sales_agi.sql with USING(true) — wide open.
-- The leads and contacts tables also have proper policies from 00004, but the
-- permissive "Allow all" policies override them (Postgres OR's permissive policies).

DROP POLICY IF EXISTS "Allow all access to leads" ON leads;
DROP POLICY IF EXISTS "Allow all access to contacts" ON contacts;
DROP POLICY IF EXISTS "Allow all access to outreach" ON outreach;
DROP POLICY IF EXISTS "Allow all access to sequences" ON sequences;
DROP POLICY IF EXISTS "Allow all access to scoring_rules" ON scoring_rules;
DROP POLICY IF EXISTS "Allow all access to email_templates" ON email_templates;

-- =========================
-- ENABLE RLS on tables that may not have it yet
-- =========================
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- =========================
-- OUTREACH: Division-scoped via parent lead's division
-- =========================
CREATE POLICY outreach_select ON outreach
  FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY outreach_insert ON outreach
  FOR INSERT TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY outreach_update ON outreach
  FOR UPDATE TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY outreach_delete ON outreach
  FOR DELETE TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- =========================
-- SEQUENCES: Division-scoped (null division = visible to all authenticated)
-- Write restricted to admin + operations_manager
-- =========================
CREATE POLICY sequences_select ON sequences
  FOR SELECT TO authenticated
  USING (
    division_id IS NULL
    OR division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY sequences_insert ON sequences
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY sequences_update ON sequences
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY sequences_delete ON sequences
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- =========================
-- SEQUENCE_STEPS: Inherit from parent sequence
-- Write restricted to admin + operations_manager
-- =========================
CREATE POLICY sequence_steps_select ON sequence_steps
  FOR SELECT TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM sequences
      WHERE division_id IS NULL
        OR division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY sequence_steps_insert ON sequence_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY sequence_steps_update ON sequence_steps
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY sequence_steps_delete ON sequence_steps
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- =========================
-- SCORING_RULES: Read by all authenticated, write by admin + operations_manager
-- =========================
CREATE POLICY scoring_rules_select ON scoring_rules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY scoring_rules_insert ON scoring_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY scoring_rules_update ON scoring_rules
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY scoring_rules_delete ON scoring_rules
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- =========================
-- EMAIL_TEMPLATES: Read by all authenticated, write by admin + operations_manager
-- =========================
CREATE POLICY email_templates_select ON email_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY email_templates_insert ON email_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY email_templates_update ON email_templates
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY email_templates_delete ON email_templates
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- =========================
-- LEAD_SCORE_HISTORY: Division-scoped via lead, immutable (SELECT + INSERT only)
-- =========================
CREATE POLICY lead_score_history_select ON lead_score_history
  FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY lead_score_history_insert ON lead_score_history
  FOR INSERT TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- No UPDATE or DELETE policies — immutable audit trail

-- =========================
-- SEQUENCE_ENROLLMENTS: Division-scoped via lead
-- =========================
CREATE POLICY sequence_enrollments_select ON sequence_enrollments
  FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY sequence_enrollments_insert ON sequence_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY sequence_enrollments_update ON sequence_enrollments
  FOR UPDATE TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY sequence_enrollments_delete ON sequence_enrollments
  FOR DELETE TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

COMMIT;
