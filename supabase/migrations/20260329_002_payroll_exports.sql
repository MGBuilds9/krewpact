-- KrewPact Payroll Export Pipeline Migration
-- Purpose: Tables for ADP CSV export/import pipeline
-- Depends on: 00011_time_expense.sql (timesheet_batches, time_entries)

BEGIN;

-- =========================
-- PAYROLL EXPORT STATUS ENUM
-- =========================
CREATE TYPE payroll_export_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'reconciled'
);

-- =========================
-- PAYROLL EXPORTS (batch-level metadata)
-- =========================
CREATE TABLE payroll_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES timesheet_batches(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  format TEXT NOT NULL DEFAULT 'adp_csv',
  status payroll_export_status NOT NULL DEFAULT 'pending',
  file_url TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_exports_batch ON payroll_exports(batch_id);
CREATE INDEX idx_payroll_exports_division ON payroll_exports(division_id);
CREATE INDEX idx_payroll_exports_status ON payroll_exports(status);
CREATE INDEX idx_payroll_exports_created_at ON payroll_exports(created_at DESC);

-- =========================
-- PAYROLL EXPORT ROWS (line-level detail)
-- =========================
CREATE TABLE payroll_export_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES payroll_exports(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  hours_regular NUMERIC(6,2) NOT NULL DEFAULT 0,
  hours_overtime NUMERIC(6,2) NOT NULL DEFAULT 0,
  cost_code TEXT,
  pay_rate NUMERIC(10,2),
  department TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_export_rows_export ON payroll_export_rows(export_id);
CREATE INDEX idx_payroll_export_rows_employee ON payroll_export_rows(employee_id);

-- =========================
-- ADP FIELD MAPPINGS (configurable mapping table)
-- =========================
CREATE TABLE adp_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_field TEXT NOT NULL,
  adp_field TEXT NOT NULL,
  transform_rule TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(internal_field, adp_field)
);

-- Seed default ADP field mappings
INSERT INTO adp_field_mappings (internal_field, adp_field, transform_rule) VALUES
  ('employee_id', 'Employee ID', NULL),
  ('hours_regular', 'Hours - Regular', NULL),
  ('hours_overtime', 'Hours - Overtime', NULL),
  ('cost_code', 'Cost Code', NULL),
  ('pay_rate', 'Pay Rate', NULL),
  ('department', 'Department', NULL);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_payroll_exports_updated_at
  BEFORE UPDATE ON payroll_exports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_adp_field_mappings_updated_at
  BEFORE UPDATE ON adp_field_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE payroll_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_export_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp_field_mappings ENABLE ROW LEVEL SECURITY;

-- PAYROLL EXPORTS: payroll_admin + platform_admin only
CREATE POLICY payroll_exports_select ON payroll_exports FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin', 'executive', 'accounting'])
  );

CREATE POLICY payroll_exports_insert ON payroll_exports FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin'])
  );

CREATE POLICY payroll_exports_update ON payroll_exports FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin'])
  );

-- PAYROLL EXPORT ROWS: inherit from payroll_exports access
CREATE POLICY payroll_export_rows_select ON payroll_export_rows FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_exports pe
      WHERE pe.id = payroll_export_rows.export_id
    )
  );

CREATE POLICY payroll_export_rows_insert ON payroll_export_rows FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin'])
  );

-- ADP FIELD MAPPINGS: readable by payroll roles, writable by admin
CREATE POLICY adp_field_mappings_select ON adp_field_mappings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY adp_field_mappings_insert ON adp_field_mappings FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY adp_field_mappings_update ON adp_field_mappings FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

COMMIT;
