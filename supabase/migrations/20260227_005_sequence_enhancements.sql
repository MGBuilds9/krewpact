-- KrewPact Migration: Sequence Builder Enhancements
-- Sprint 5: Visual flow builder data model + auto-enrollment + delivery tracking

BEGIN;

-- =========================
-- SEQUENCE STATUS
-- =========================
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'paused', 'archived'));

-- Migrate is_active to status
UPDATE sequences SET status = CASE WHEN is_active THEN 'active' ELSE 'paused' END
  WHERE status = 'draft' AND is_active IS NOT NULL;

-- =========================
-- SEQUENCE STEPS: Branching + Canvas Position
-- =========================
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS condition_type TEXT
  CHECK (condition_type IS NULL OR condition_type IN (
    'if_score', 'if_email_opened', 'if_replied', 'if_tag', 'if_stage'
  ));
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS condition_config JSONB;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS true_next_step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS false_next_step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS position_x FLOAT DEFAULT 0;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS position_y FLOAT DEFAULT 0;

-- Add 'condition' to action_type options
-- (No constraint on action_type in original schema, so just documenting: email, task, wait, condition)

-- =========================
-- SEQUENCE ENROLLMENTS: Pending Review + Current Step ID
-- =========================
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS current_step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS trigger_event JSONB;

-- Update status check to include pending_review
ALTER TABLE sequence_enrollments DROP CONSTRAINT IF EXISTS sequence_enrollments_status_check;
ALTER TABLE sequence_enrollments ADD CONSTRAINT sequence_enrollments_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'pending_review'));

-- =========================
-- OUTREACH: Delivery Tracking
-- =========================

-- Check if outreach_events exists (from enrichment migration), use outreach if not
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach_events') THEN
    ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent'
      CHECK (delivery_status IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'));
    ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
    ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
    ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach') THEN
    ALTER TABLE outreach ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent'
      CHECK (delivery_status IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'));
    ALTER TABLE outreach ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
    ALTER TABLE outreach ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
    ALTER TABLE outreach ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
  END IF;
END $$;

-- =========================
-- PENDING ENROLLMENTS RLS
-- =========================
-- Sequence enrollments already have RLS from 20260227_001_rls_lockdown.sql
-- No additional policies needed — pending_review enrollments visible via same division-scoped policies

COMMIT;
