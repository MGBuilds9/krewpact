-- KrewPact Migration: Lead Stage History + SLA Timers
-- Purpose: Track lead stage transitions (mirrors opportunity_stage_history)
--          and add stage_entered_at for SLA tracking

BEGIN;

-- =========================
-- LEAD STAGE HISTORY (immutable audit trail)
-- =========================
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_created ON lead_stage_history(created_at);

-- RLS: Division-scoped via lead, immutable (SELECT + INSERT only)
ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_stage_history_select ON lead_stage_history
  FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

CREATE POLICY lead_stage_history_insert ON lead_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads
      WHERE division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    )
    OR public.is_platform_admin()
  );

-- No UPDATE or DELETE — immutable audit trail

-- =========================
-- SLA: Add stage_entered_at to leads and opportunities
-- =========================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger: auto-update stage_entered_at on lead stage change
CREATE OR REPLACE FUNCTION update_lead_stage_entered_at() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.stage_entered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_stage_entered_at ON leads;
CREATE TRIGGER trg_lead_stage_entered_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_stage_entered_at();

-- Trigger: auto-update stage_entered_at on opportunity stage change
CREATE OR REPLACE FUNCTION update_opp_stage_entered_at() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_entered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opp_stage_entered_at ON opportunities;
CREATE TRIGGER trg_opp_stage_entered_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opp_stage_entered_at();

COMMIT;
