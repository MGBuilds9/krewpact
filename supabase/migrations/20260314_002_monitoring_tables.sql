-- Monitoring tables for cron watchdog and smoke testing
-- Layer 3: Synthetic Monitoring + Alerting

-- ── cron_runs: tracks every cron job execution ──────────────────────────────
CREATE TABLE IF NOT EXISTS cron_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name    text NOT NULL,
  status       text NOT NULL CHECK (status IN ('success', 'failure', 'timeout')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  duration_ms  integer,
  result       jsonb DEFAULT '{}',
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for watchdog queries: "last run per cron_name"
CREATE INDEX idx_cron_runs_name_started ON cron_runs (cron_name, started_at DESC);

-- Retention: auto-delete rows older than 30 days (clean up via cron or pg_cron)
-- For now, manual cleanup is fine — table is small

-- ── smoke_test_results: tracks internal smoke test outcomes ─────────────────
CREATE TABLE IF NOT EXISTS smoke_test_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status       text NOT NULL CHECK (status IN ('pass', 'fail', 'partial')),
  checks       jsonb NOT NULL DEFAULT '{}',
  failed_checks text[] DEFAULT '{}',
  duration_ms  integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_smoke_test_results_created ON smoke_test_results (created_at DESC);

-- RLS: these tables are admin-only (service role access)
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_test_results ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (no user-facing access)
CREATE POLICY "Service role full access on cron_runs"
  ON cron_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on smoke_test_results"
  ON smoke_test_results FOR ALL
  USING (auth.role() = 'service_role');
