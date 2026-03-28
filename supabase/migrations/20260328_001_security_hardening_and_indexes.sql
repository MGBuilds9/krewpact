-- Security hardening, missing indexes, dead table cleanup.
-- Applied to live DB on 2026-03-28 via Supabase MCP execute_sql.
-- This migration file records the changes for git history.

-- ============================================================
-- 1. SECURITY: Drop dangerous policies
-- ============================================================

-- 1a. Contacts anon PII leak (232 rows of contact PII exposed to anonymous)
DROP POLICY IF EXISTS contacts_anon_select ON contacts;

-- 1b. Knowledge tables: public ALL → authenticated read + service write
DROP POLICY IF EXISTS "Allow all write access to knowledge_embeddings" ON knowledge_embeddings;
DROP POLICY IF EXISTS "Allow all read access to knowledge_embeddings" ON knowledge_embeddings;
DROP POLICY IF EXISTS "Allow all write access to knowledge_docs" ON knowledge_docs;
DROP POLICY IF EXISTS "Allow all read access to knowledge_docs" ON knowledge_docs;

CREATE POLICY knowledge_embeddings_auth_select ON knowledge_embeddings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY knowledge_embeddings_service_write ON knowledge_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY knowledge_docs_auth_select ON knowledge_docs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY knowledge_docs_service_write ON knowledge_docs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1c. lead_workstation_notes: public → authenticated only
DROP POLICY IF EXISTS "Allow all access to lead_workstation_notes" ON lead_workstation_notes;
CREATE POLICY lead_workstation_notes_auth_all ON lead_workstation_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 1d. entity_tags: tighten delete to platform_admin only
DROP POLICY IF EXISTS entity_tags_insert ON entity_tags;
DROP POLICY IF EXISTS entity_tags_delete ON entity_tags;
CREATE POLICY entity_tags_insert ON entity_tags
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY entity_tags_delete ON entity_tags
  FOR DELETE TO authenticated USING (is_platform_admin());

-- 1e. notes: restrict insert to note author
DROP POLICY IF EXISTS notes_insert ON notes;
CREATE POLICY notes_insert ON notes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (public.krewpact_user_id())::uuid);

-- 1f. Policies for RLS-enabled tables that had zero policies (locked out)
CREATE POLICY apollo_profile_runs_service ON apollo_profile_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY apollo_pump_state_service ON apollo_pump_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY smoke_test_results_service ON smoke_test_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1g. Revoke anon from materialized view
REVOKE SELECT ON inventory_stock_summary FROM anon;

-- ============================================================
-- 2. SECURITY: Fix function search_path injection risk
-- ============================================================

ALTER FUNCTION public.calculate_lead_score SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_clerk_user SET search_path = public, pg_temp;
ALTER FUNCTION public.update_lead_stage_entered_at SET search_path = public, pg_temp;
ALTER FUNCTION public.update_opp_stage_entered_at SET search_path = public, pg_temp;
ALTER FUNCTION public.update_takeoff_jobs_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION public.default_org_id SET search_path = public, pg_temp;
ALTER FUNCTION public.krewpact_org_id SET search_path = public, pg_temp;
ALTER FUNCTION public.krewpact_divisions SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION public.is_platform_admin SET search_path = public, pg_temp;
ALTER FUNCTION public.match_knowledge SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_account_stats SET search_path = public, pg_temp;
ALTER FUNCTION public.krewpact_user_id SET search_path = public, pg_temp;
ALTER FUNCTION public.krewpact_roles SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role_names SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_permissions SET search_path = public, pg_temp;

-- ============================================================
-- 3. PERFORMANCE: Missing indexes on most-queried tables
-- ============================================================

-- activities: 206 rows, queried on 5+ FK columns, had only PK + opportunity_id + org_id
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_account ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner_due ON activities(owner_user_id, due_at);

-- sequence_enrollments: 103 rows, cron processor target, only PK + unique(sequence_id, lead_id)
CREATE INDEX IF NOT EXISTS idx_enrollments_status_next ON sequence_enrollments(status, next_step_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON sequence_enrollments(lead_id);

-- opportunities: RLS scans division_id on every row read
CREATE INDEX IF NOT EXISTS idx_opportunities_division ON opportunities(division_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_user_id);

-- outreach + lead_score_history: FK columns with no index
CREATE INDEX IF NOT EXISTS idx_outreach_lead ON outreach(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_lead ON lead_score_history(lead_id);

-- ============================================================
-- 4. CLEANUP: Drop dead tables (0 rows, 0 app code references)
-- ============================================================

DROP TABLE IF EXISTS adoption_kpis CASCADE;
DROP TABLE IF EXISTS feature_usage_events CASCADE;
DROP TABLE IF EXISTS migration_records CASCADE;
DROP TABLE IF EXISTS migration_conflicts CASCADE;
DROP TABLE IF EXISTS migration_attachments CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
