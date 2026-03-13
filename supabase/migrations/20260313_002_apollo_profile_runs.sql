-- Apollo profile run tracking for performance analytics
-- Each cron run writes a row; scoring cron backfills quality metrics later

CREATE TABLE IF NOT EXISTS apollo_profile_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  division_code TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  leads_found INTEGER DEFAULT 0,
  leads_imported INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  page_start INTEGER,
  page_end INTEGER,
  -- Performance metrics (populated by scoring cron later)
  avg_score_at_30_days NUMERIC(5,2),
  leads_qualified INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profile_runs_profile ON apollo_profile_runs(profile_id);
CREATE INDEX idx_profile_runs_date ON apollo_profile_runs(run_at DESC);

-- RLS: service role only (cron jobs)
ALTER TABLE apollo_profile_runs ENABLE ROW LEVEL SECURITY;
