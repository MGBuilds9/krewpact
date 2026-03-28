-- Create missing tables referenced by app code + executive metrics RPCs.
-- Applied to live DB on 2026-03-28 via Supabase MCP.

-- ============================================================
-- 1. MISSING TABLES
-- ============================================================

-- contact_account_links: M:N junction for contacts ↔ accounts
CREATE TABLE IF NOT EXISTS contact_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'primary',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, account_id)
);
ALTER TABLE contact_account_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contact_account_links_contact ON contact_account_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_account_links_account ON contact_account_links(account_id);

-- crm_settings: key-value config
CREATE TABLE IF NOT EXISTS crm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- enrichment_jobs: enrichment pipeline tracking
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_lead ON enrichment_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);

-- document_attachments: generic document attachment junction
CREATE TABLE IF NOT EXISTS document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_id UUID REFERENCES file_metadata(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_document_attachments_entity ON document_attachments(entity_type, entity_id);

-- contracts: project contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  contract_type TEXT,
  value NUMERIC(15,2),
  start_date DATE,
  end_date DATE,
  signed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_opportunity ON contracts(opportunity_id);

-- meeting_notes: portal meeting notes
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  meeting_date TIMESTAMPTZ,
  attendees TEXT[],
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project ON meeting_notes(project_id);

-- portal_satisfaction_surveys
CREATE TABLE IF NOT EXISTS portal_satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE portal_satisfaction_surveys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_portal_surveys_project ON portal_satisfaction_surveys(project_id);

-- submittal_distributions
CREATE TABLE IF NOT EXISTS submittal_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,
  recipient_id UUID,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE submittal_distributions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_submittal_distributions_submittal ON submittal_distributions(submittal_id);

-- ============================================================
-- 2. EXECUTIVE METRICS RPCs (replace full-table JS aggregation)
-- ============================================================

CREATE OR REPLACE FUNCTION get_pipeline_summary(p_division_id uuid DEFAULT NULL)
RETURNS TABLE(stage text, count bigint, value numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT stage::text, COUNT(*)::bigint, COALESCE(SUM(estimated_revenue), 0)::numeric
  FROM opportunities
  WHERE (p_division_id IS NULL OR division_id = p_division_id)
  GROUP BY stage;
$$;

CREATE OR REPLACE FUNCTION get_project_portfolio(p_division_id uuid DEFAULT NULL)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT status::text, COUNT(*)::bigint
  FROM projects
  WHERE (p_division_id IS NULL OR division_id = p_division_id)
  GROUP BY status;
$$;

CREATE OR REPLACE FUNCTION get_estimating_velocity(p_division_id uuid DEFAULT NULL)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT status::text, COUNT(*)::bigint
  FROM estimates
  WHERE (p_division_id IS NULL OR division_id = p_division_id)
  GROUP BY status;
$$;

CREATE OR REPLACE FUNCTION get_subscription_summary()
RETURNS TABLE(total_monthly numeric, active_count bigint, expiring_soon_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    COALESCE(SUM(monthly_cost) FILTER (WHERE is_active), 0)::numeric,
    COUNT(*) FILTER (WHERE is_active)::bigint,
    COUNT(*) FILTER (WHERE is_active AND renewal_date <= CURRENT_DATE + INTERVAL '30 days')::bigint
  FROM executive_subscriptions;
$$;
