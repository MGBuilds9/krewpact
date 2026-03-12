-- Phase 1: Account Enrichment + Client Project History + ICP + Lead-Account Matching
-- Part of Closed-Loop CRM: Client Import, ICP Generation & Sales Intelligence

-- ============================================================
-- 1A. Enrich accounts table
-- ============================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email CITEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS company_code TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS lifetime_revenue NUMERIC(14,2) DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS first_project_date DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_project_date DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_repeat_client BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_accounts_industry ON accounts(industry);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_company_code ON accounts(company_code);
CREATE INDEX IF NOT EXISTS idx_accounts_tags ON accounts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 1B. Client project history table
-- ============================================================

CREATE TABLE IF NOT EXISTS client_project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_number TEXT,
  project_name TEXT NOT NULL,
  project_description TEXT,
  project_address JSONB,
  start_date DATE,
  end_date DATE,
  estimated_value NUMERIC(14,2),
  outcome TEXT DEFAULT 'completed',
  source TEXT DEFAULT 'import',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cph_account ON client_project_history(account_id);
CREATE INDEX IF NOT EXISTS idx_cph_outcome ON client_project_history(outcome);

-- RLS for client_project_history
ALTER TABLE client_project_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client project history"
  ON client_project_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client project history"
  ON client_project_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client project history"
  ON client_project_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client project history"
  ON client_project_history FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 1C. Ideal client profiles table
-- ============================================================

CREATE TABLE IF NOT EXISTS ideal_client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  industry_match TEXT[],
  geography_match JSONB,
  project_value_range JSONB,
  project_types TEXT[],
  company_size_range JSONB,
  repeat_rate_weight NUMERIC(3,2) DEFAULT 0.25,
  sample_size INTEGER DEFAULT 0,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  avg_deal_value NUMERIC(14,2),
  avg_project_duration_days INTEGER,
  top_sources TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ideal_client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ICPs"
  ON ideal_client_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ICPs"
  ON ideal_client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ICPs"
  ON ideal_client_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ICPs"
  ON ideal_client_profiles FOR DELETE
  TO authenticated
  USING (true);

-- ICP-to-lead match scores (cached)
CREATE TABLE IF NOT EXISTS icp_lead_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icp_id UUID NOT NULL REFERENCES ideal_client_profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2) NOT NULL,
  match_details JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(icp_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_icp_lead_matches_lead ON icp_lead_matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_icp_lead_matches_score ON icp_lead_matches(match_score DESC);

ALTER TABLE icp_lead_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ICP lead matches"
  ON icp_lead_matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ICP lead matches"
  ON icp_lead_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ICP lead matches"
  ON icp_lead_matches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ICP lead matches"
  ON icp_lead_matches FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 1D. Lead-account matches table
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_account_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  match_score NUMERIC(5,2) NOT NULL,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_lam_lead ON lead_account_matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_lam_account ON lead_account_matches(account_id);
CREATE INDEX IF NOT EXISTS idx_lam_unconfirmed ON lead_account_matches(is_confirmed) WHERE is_confirmed = FALSE;

ALTER TABLE lead_account_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lead account matches"
  ON lead_account_matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lead account matches"
  ON lead_account_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead account matches"
  ON lead_account_matches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lead account matches"
  ON lead_account_matches FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Helper: Recompute account stats from project history
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
BEGIN
  SELECT
    COUNT(*),
    MIN(COALESCE(start_date, created_at::date)),
    MAX(COALESCE(end_date, start_date, created_at::date))
  INTO v_total, v_first, v_last
  FROM client_project_history
  WHERE account_id = p_account_id;

  UPDATE accounts SET
    total_projects = COALESCE(v_total, 0),
    first_project_date = v_first,
    last_project_date = v_last,
    is_repeat_client = COALESCE(v_total, 0) >= 2,
    updated_at = NOW()
  WHERE id = p_account_id;
END;
$$;
