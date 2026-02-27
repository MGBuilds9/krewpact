-- KrewPact Time + Expense Migration
-- Purpose: Time entries, timesheet batches, expense receipts, approvals
-- Depends on: 00003_crm_operations.sql (projects, tasks, users, divisions, expense_claims)

BEGIN;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'exported');

-- =========================
-- TIME ENTRIES
-- =========================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_regular NUMERIC(6,2) NOT NULL DEFAULT 0,
  hours_overtime NUMERIC(6,2) NOT NULL DEFAULT 0,
  cost_code TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, work_date DESC);

-- =========================
-- TIMESHEET BATCHES
-- =========================
CREATE TABLE timesheet_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status timesheet_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  exported_at TIMESTAMPTZ,
  adp_export_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(period_end >= period_start)
);

CREATE INDEX idx_timesheet_batches_division ON timesheet_batches(division_id);

-- =========================
-- EXPENSE RECEIPTS
-- =========================
CREATE TABLE expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  file_id UUID NOT NULL,
  ocr_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_receipts_expense ON expense_receipts(expense_id);

-- =========================
-- EXPENSE APPROVALS
-- =========================
CREATE TABLE expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_approvals_expense ON expense_approvals(expense_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timesheet_batches_updated_at BEFORE UPDATE ON timesheet_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;

-- TIME ENTRIES: Project-member scoped
CREATE POLICY time_entries_select ON time_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = time_entries.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY time_entries_insert ON time_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = time_entries.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY time_entries_update ON time_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = time_entries.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- TIMESHEET BATCHES: Division-scoped
CREATE POLICY timesheet_batches_select ON timesheet_batches FOR SELECT TO authenticated
  USING (timesheet_batches.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());
CREATE POLICY timesheet_batches_insert ON timesheet_batches FOR INSERT TO authenticated
  WITH CHECK (timesheet_batches.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());
CREATE POLICY timesheet_batches_update ON timesheet_batches FOR UPDATE TO authenticated
  USING (timesheet_batches.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());

-- EXPENSE RECEIPTS: Inherit from expense_claims → user ownership
CREATE POLICY expense_receipts_select ON expense_receipts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM expense_claims ec WHERE ec.id = expense_receipts.expense_id AND (ec.user_id = public.krewpact_user_id()::uuid OR public.is_platform_admin())));
CREATE POLICY expense_receipts_insert ON expense_receipts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM expense_claims ec WHERE ec.id = expense_receipts.expense_id AND (ec.user_id = public.krewpact_user_id()::uuid OR public.is_platform_admin())));

-- EXPENSE APPROVALS: Admin/manager only
CREATE POLICY expense_approvals_select ON expense_approvals FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY expense_approvals_insert ON expense_approvals FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

COMMIT;
