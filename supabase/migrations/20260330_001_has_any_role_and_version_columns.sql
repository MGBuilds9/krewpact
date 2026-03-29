-- has_any_role function for RLS policies (e.g., payroll_exports)
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(public.krewpact_roles()) AS r(role)
    WHERE r.role = ANY(required_roles)
  );
$$;

-- Add version columns to offline-synced entity tables for conflict detection
ALTER TABLE project_daily_logs ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE safety_forms ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE photo_assets ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION public.increment_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_daily_logs_increment_version
  BEFORE UPDATE ON project_daily_logs
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER trg_time_entries_increment_version
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER trg_safety_forms_increment_version
  BEFORE UPDATE ON safety_forms
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER trg_photo_assets_increment_version
  BEFORE UPDATE ON photo_assets
  FOR EACH ROW EXECUTE FUNCTION increment_version();
