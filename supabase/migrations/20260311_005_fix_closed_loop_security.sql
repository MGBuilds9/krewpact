-- ============================================================
-- Migration: Fix closed-loop tables security, org isolation,
-- triggers, and recompute_account_stats
-- ============================================================

-- ============================================================
-- 1. Add org_id to all 4 new tables
-- ============================================================

ALTER TABLE client_project_history ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE ideal_client_profiles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE icp_lead_matches ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE lead_account_matches ADD COLUMN IF NOT EXISTS org_id UUID;

-- Backfill org_id from parent tables where possible
UPDATE client_project_history cph
SET org_id = a.org_id
FROM accounts a
WHERE cph.account_id = a.id AND cph.org_id IS NULL;

UPDATE lead_account_matches lam
SET org_id = l.org_id
FROM leads l
WHERE lam.lead_id = l.id AND lam.org_id IS NULL;

UPDATE icp_lead_matches ilm
SET org_id = l.org_id
FROM leads l
WHERE ilm.lead_id = l.id AND ilm.org_id IS NULL;

-- For ICPs, backfill from divisions if available, else from first account
UPDATE ideal_client_profiles icp
SET org_id = d.org_id
FROM divisions d
WHERE icp.division_id = d.id AND icp.org_id IS NULL;

-- ============================================================
-- 2. Drop permissive USING(true) policies, replace with org-scoped
-- ============================================================

-- client_project_history
DROP POLICY IF EXISTS "Authenticated users can read client project history" ON client_project_history;
DROP POLICY IF EXISTS "Authenticated users can insert client project history" ON client_project_history;
DROP POLICY IF EXISTS "Authenticated users can update client project history" ON client_project_history;
DROP POLICY IF EXISTS "Authenticated users can delete client project history" ON client_project_history;

CREATE POLICY "org_select_client_project_history" ON client_project_history
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_insert_client_project_history" ON client_project_history
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_update_client_project_history" ON client_project_history
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_delete_client_project_history" ON client_project_history
  FOR DELETE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- ideal_client_profiles
DROP POLICY IF EXISTS "Authenticated users can read ICPs" ON ideal_client_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert ICPs" ON ideal_client_profiles;
DROP POLICY IF EXISTS "Authenticated users can update ICPs" ON ideal_client_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete ICPs" ON ideal_client_profiles;

CREATE POLICY "org_select_ideal_client_profiles" ON ideal_client_profiles
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_insert_ideal_client_profiles" ON ideal_client_profiles
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_update_ideal_client_profiles" ON ideal_client_profiles
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_delete_ideal_client_profiles" ON ideal_client_profiles
  FOR DELETE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- icp_lead_matches
DROP POLICY IF EXISTS "Authenticated users can read ICP lead matches" ON icp_lead_matches;
DROP POLICY IF EXISTS "Authenticated users can insert ICP lead matches" ON icp_lead_matches;
DROP POLICY IF EXISTS "Authenticated users can update ICP lead matches" ON icp_lead_matches;
DROP POLICY IF EXISTS "Authenticated users can delete ICP lead matches" ON icp_lead_matches;

CREATE POLICY "org_select_icp_lead_matches" ON icp_lead_matches
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_insert_icp_lead_matches" ON icp_lead_matches
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_update_icp_lead_matches" ON icp_lead_matches
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_delete_icp_lead_matches" ON icp_lead_matches
  FOR DELETE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- lead_account_matches
DROP POLICY IF EXISTS "Authenticated users can read lead account matches" ON lead_account_matches;
DROP POLICY IF EXISTS "Authenticated users can insert lead account matches" ON lead_account_matches;
DROP POLICY IF EXISTS "Authenticated users can update lead account matches" ON lead_account_matches;
DROP POLICY IF EXISTS "Authenticated users can delete lead account matches" ON lead_account_matches;

CREATE POLICY "org_select_lead_account_matches" ON lead_account_matches
  FOR SELECT TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_insert_lead_account_matches" ON lead_account_matches
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_update_lead_account_matches" ON lead_account_matches
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY "org_delete_lead_account_matches" ON lead_account_matches
  FOR DELETE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- ============================================================
-- 3. Add updated_at triggers
-- ============================================================

CREATE TRIGGER trg_client_project_history_updated_at
  BEFORE UPDATE ON client_project_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ideal_client_profiles_updated_at
  BEFORE UPDATE ON ideal_client_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- icp_lead_matches and lead_account_matches don't have updated_at columns,
-- so no trigger needed

-- ============================================================
-- 4. Add missing index on icp_lead_matches.icp_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_icp_lead_matches_icp ON icp_lead_matches(icp_id);

-- ============================================================
-- 5. Fix recompute_account_stats to include lifetime_revenue
-- ============================================================

CREATE OR REPLACE FUNCTION recompute_account_stats(p_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_first DATE;
  v_last DATE;
  v_revenue NUMERIC(14,2);
BEGIN
  SELECT
    COUNT(*),
    MIN(COALESCE(start_date, created_at::date)),
    MAX(COALESCE(end_date, start_date, created_at::date)),
    COALESCE(SUM(estimated_value), 0)
  INTO v_total, v_first, v_last, v_revenue
  FROM client_project_history
  WHERE account_id = p_account_id;

  UPDATE accounts SET
    total_projects = COALESCE(v_total, 0),
    first_project_date = v_first,
    last_project_date = v_last,
    lifetime_revenue = v_revenue,
    is_repeat_client = COALESCE(v_total, 0) >= 2,
    updated_at = NOW()
  WHERE id = p_account_id;
END;
$$;

-- ============================================================
-- 6. Fix confirmed_by column type (TEXT not UUID FK)
-- Allow Clerk user IDs or krewpact_user_id UUIDs
-- ============================================================

-- Drop the FK constraint so we can store krewpact_user_id (which IS a UUID)
-- but also handle cases where the column already has data
ALTER TABLE lead_account_matches
  DROP CONSTRAINT IF EXISTS lead_account_matches_confirmed_by_fkey;

-- The column stays UUID type — the API layer should use getKrewpactUserId()
-- which returns the proper users table UUID
