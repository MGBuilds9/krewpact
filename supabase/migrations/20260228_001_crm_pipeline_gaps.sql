-- CRM Pipeline Gaps: contacted stage, saved views, lead assignment rules, source_channel on opportunities
-- Gap 1: Add 'contacted' to lead_stage enum
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'contacted' AFTER 'new';

-- Gap 8: Saved views table
CREATE TABLE IF NOT EXISTS crm_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (auth.jwt() ->> 'krewpact_user_id'),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'account', 'opportunity')),
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  sort_by TEXT,
  sort_dir TEXT CHECK (sort_dir IN ('asc', 'desc')),
  columns TEXT[],
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for saved views: users can only see/manage their own views
ALTER TABLE crm_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_saved_views_select ON crm_saved_views
  FOR SELECT USING (user_id = (auth.jwt() ->> 'krewpact_user_id'));

CREATE POLICY crm_saved_views_insert ON crm_saved_views
  FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'krewpact_user_id'));

CREATE POLICY crm_saved_views_update ON crm_saved_views
  FOR UPDATE USING (user_id = (auth.jwt() ->> 'krewpact_user_id'));

CREATE POLICY crm_saved_views_delete ON crm_saved_views
  FOR DELETE USING (user_id = (auth.jwt() ->> 'krewpact_user_id'));

-- Gap 3: Lead assignment rules table
CREATE TABLE IF NOT EXISTS lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id),
  source_channel TEXT,
  assigned_user_id UUID NOT NULL REFERENCES users(id),
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lead_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_assignment_rules_select ON lead_assignment_rules
  FOR SELECT USING (true);

-- Gap 9: Add source_channel to opportunities (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'source_channel'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN source_channel TEXT;
  END IF;
END $$;

-- Gap 6: Add opened_at and clicked_at to outreach_events (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outreach_events' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE outreach_events ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outreach_events' AND column_name = 'clicked_at'
  ) THEN
    ALTER TABLE outreach_events ADD COLUMN clicked_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for tracking pixel lookups
CREATE INDEX IF NOT EXISTS idx_outreach_events_opened ON outreach_events (id) WHERE opened_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_events_clicked ON outreach_events (id) WHERE clicked_at IS NULL;

-- Index for saved views by user + entity type
CREATE INDEX IF NOT EXISTS idx_crm_saved_views_user_entity ON crm_saved_views (user_id, entity_type);

-- Index for assignment rules lookup
CREATE INDEX IF NOT EXISTS idx_lead_assignment_rules_active ON lead_assignment_rules (is_active, priority)
  WHERE is_active = true;
