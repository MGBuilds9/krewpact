-- Set a sensible default for feature_flags so new orgs see all core routes.
-- Existing orgs with empty flags ('{}') also get the defaults applied.

-- 1. Change the column default
ALTER TABLE org_settings
  ALTER COLUMN feature_flags
  SET DEFAULT '{"crm":true,"estimates":true,"projects":true,"inventory":true,"finance":true,"executive":true,"reports":true,"payroll":true,"schedule":true,"documents":true}'::jsonb;

-- 2. Backfill existing orgs that still have empty flags
UPDATE org_settings
SET feature_flags = '{"crm":true,"estimates":true,"projects":true,"inventory":true,"finance":true,"executive":true,"reports":true,"payroll":true,"schedule":true,"documents":true}'::jsonb,
    updated_at = NOW()
WHERE feature_flags = '{}'::jsonb;
