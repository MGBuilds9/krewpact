-- Purpose: Unify the split-brain opportunity stage model.
--
-- Before this migration:
--   - CRM code used `contracted` as the terminal won stage (the "Mark as Won"
--     action left the row in stage='contracted' and merely set won_at).
--   - Reporting/executive code (app/api/executive/*, reports/pipeline,
--     PipelineChart, MetricsGrid, pipeline-intelligence, executive/metrics)
--     filtered on `stage = 'closed_won'`, which never matched anything.
--   - Result: every executive dashboard KPI that used "won deals" read 0.
--
-- This migration adds the `closed_won` enum value. A separate follow-up
-- migration (20260407_002_migrate_contracted_won_to_closed_won.sql)
-- backfills existing won rows. They MUST be separate files because
-- Postgres does not allow a new enum value to be used in the same
-- transaction that added it.
--
-- See plan: /Users/mkgbuilds/.claude/plans/swirling-weaving-cosmos.md
--   PR 3 — ISSUE-012 Path A2 (unify on closed_won).

ALTER TYPE opportunity_stage ADD VALUE IF NOT EXISTS 'closed_won' AFTER 'contracted';
