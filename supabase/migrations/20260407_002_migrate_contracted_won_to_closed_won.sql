-- Purpose: Backfill rows that were marked won under the old
-- `contracted + won_at` convention to the new `closed_won` terminal stage.
--
-- Prerequisite: 20260407_001_add_closed_won_stage.sql (adds the enum value).
-- They live in separate files because Postgres refuses to use a brand-new
-- enum value in the same transaction that added it.
--
-- Rollback: `UPDATE opportunities SET stage = 'contracted' WHERE stage = 'closed_won';`
-- This is safe because the `contracted` value never left the enum.

UPDATE opportunities
SET stage = 'closed_won'
WHERE stage = 'contracted'
  AND won_at IS NOT NULL;
