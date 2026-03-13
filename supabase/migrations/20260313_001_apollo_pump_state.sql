-- Apollo pump pagination watermark and credit tracking per search profile
-- Enables auto-rotation: each profile tracks where it left off

CREATE TABLE IF NOT EXISTS apollo_pump_state (
  profile_id TEXT PRIMARY KEY,
  division_code TEXT,
  last_page INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  total_imported INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  credits_used_this_month INTEGER DEFAULT 0,
  month_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service role only (cron jobs)
ALTER TABLE apollo_pump_state ENABLE ROW LEVEL SECURITY;
