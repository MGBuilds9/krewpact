-- Migration: 20260312_001_ai_agentic_layer
-- Creates 3 tables for the AI agentic layer: ai_insights, user_digests, ai_actions

-- ============================================================
-- TABLE: ai_insights
-- ============================================================
CREATE TABLE ai_insights (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  entity_type     TEXT        NOT NULL, -- 'lead', 'opportunity', 'project', 'account', 'task'
  entity_id       UUID        NOT NULL,
  insight_type    TEXT        NOT NULL, -- 'stale_deal', 'bid_match', 'budget_alert', etc.
  title           TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  confidence      FLOAT       DEFAULT 0.5,
  action_url      TEXT,
  action_label    TEXT,
  metadata        JSONB       DEFAULT '{}',
  model_used      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  dismissed_by    UUID        REFERENCES users(id),
  acted_on_at     TIMESTAMPTZ,
  acted_on_by     UUID        REFERENCES users(id)
);

-- Indexes for ai_insights
CREATE INDEX idx_ai_insights_entity
  ON ai_insights (entity_type, entity_id)
  WHERE dismissed_at IS NULL;

CREATE INDEX idx_ai_insights_org_id
  ON ai_insights (org_id);

CREATE INDEX idx_ai_insights_expires_at
  ON ai_insights (expires_at)
  WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- SELECT: user can read rows where org_id matches their org
CREATE POLICY "ai_insights_select"
  ON ai_insights
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = (auth.jwt() ->> 'krewpact_user_id')::uuid
    )
  );

-- UPDATE: user can update (dismiss / act) rows in their org
CREATE POLICY "ai_insights_update"
  ON ai_insights
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = (auth.jwt() ->> 'krewpact_user_id')::uuid
    )
  );

-- INSERT: service role only — no user insert policy

-- ============================================================
-- TABLE: user_digests
-- ============================================================
CREATE TABLE user_digests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(id),
  org_id         UUID        NOT NULL REFERENCES organizations(id),
  digest_date    DATE        NOT NULL,
  sections       JSONB       NOT NULL,
  summary        TEXT        NOT NULL,
  email_sent_at  TIMESTAMPTZ,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, digest_date)
);

-- Indexes for user_digests
CREATE INDEX idx_user_digests_user_date
  ON user_digests (user_id, digest_date);

-- Enable RLS
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;

-- SELECT: user can read rows where org_id matches their org
CREATE POLICY "user_digests_select"
  ON user_digests
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = (auth.jwt() ->> 'krewpact_user_id')::uuid
    )
  );

-- INSERT: service role only — no user insert policy

-- ============================================================
-- TABLE: ai_actions
-- ============================================================
CREATE TABLE ai_actions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id),
  user_id       UUID        REFERENCES users(id),
  action_type   TEXT        NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  model_used    TEXT        NOT NULL,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_cents    INTEGER,
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ai_actions
CREATE INDEX idx_ai_actions_org_created
  ON ai_actions (org_id, created_at);

-- Enable RLS
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;

-- SELECT: user can read rows where org_id matches their org
CREATE POLICY "ai_actions_select"
  ON ai_actions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = (auth.jwt() ->> 'krewpact_user_id')::uuid
    )
  );

-- INSERT: service role only — no user insert policy
