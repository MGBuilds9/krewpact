-- Smoke test results table for alert cooldown tracking
CREATE TABLE IF NOT EXISTS smoke_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL,  -- 'pass', 'partial', 'fail'
  checks jsonb NOT NULL DEFAULT '{}',
  failed_checks text[] NOT NULL DEFAULT '{}',
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smoke_test_results_created ON smoke_test_results (created_at DESC);
