-- KrewPact Finance Snapshots Migration
-- Purpose: Invoice, PO, and job cost snapshots from ERPNext
-- Depends on: 00003_crm_operations.sql (projects, users)

BEGIN;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE invoice_snapshot_status AS ENUM ('draft', 'submitted', 'paid', 'overdue', 'cancelled');
CREATE TYPE po_snapshot_status AS ENUM ('draft', 'submitted', 'approved', 'received', 'closed', 'cancelled');

-- =========================
-- INVOICE SNAPSHOTS
-- =========================
CREATE TABLE invoice_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  invoice_date DATE,
  due_date DATE,
  status invoice_snapshot_status NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_link_url TEXT,
  erp_docname TEXT,
  snapshot_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invoice_number)
);

CREATE INDEX idx_invoice_snapshots_project_status ON invoice_snapshots(project_id, status);

-- =========================
-- PO SNAPSHOTS
-- =========================
CREATE TABLE po_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  supplier_name TEXT,
  po_date DATE,
  status po_snapshot_status NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  erp_docname TEXT,
  snapshot_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(po_number)
);

CREATE INDEX idx_po_snapshots_project ON po_snapshots(project_id);

-- =========================
-- JOB COST SNAPSHOTS
-- =========================
CREATE TABLE job_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  baseline_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  revised_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  committed_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  forecast_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  forecast_margin_pct NUMERIC(6,3),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, snapshot_date)
);

CREATE INDEX idx_job_cost_snapshots_project ON job_cost_snapshots(project_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_invoice_snapshots_updated_at BEFORE UPDATE ON invoice_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_po_snapshots_updated_at BEFORE UPDATE ON po_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (project-member or division-scoped)
-- =========================
ALTER TABLE invoice_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_snapshots_select ON invoice_snapshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = invoice_snapshots.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY invoice_snapshots_insert ON invoice_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY invoice_snapshots_update ON invoice_snapshots FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY po_snapshots_select ON po_snapshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = po_snapshots.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY po_snapshots_insert ON po_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY po_snapshots_update ON po_snapshots FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY job_cost_snapshots_select ON job_cost_snapshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = job_cost_snapshots.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY job_cost_snapshots_insert ON job_cost_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

COMMIT;
