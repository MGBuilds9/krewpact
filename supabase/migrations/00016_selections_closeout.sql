-- KrewPact Selections + Closeout Migration
-- Purpose: Selection sheets, deficiencies, warranty, service calls
-- Depends on: 00003_crm_operations.sql (projects, project_members, users)

BEGIN;

-- =========================
-- SELECTION SHEETS
-- =========================
CREATE TABLE selection_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','client_review','approved','locked')),
  issued_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_selection_sheets_project_status ON selection_sheets(project_id, status);

-- =========================
-- SELECTION OPTIONS
-- =========================
CREATE TABLE selection_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_sheet_id UUID NOT NULL REFERENCES selection_sheets(id) ON DELETE CASCADE,
  option_group TEXT NOT NULL,
  option_name TEXT NOT NULL,
  allowance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  upgrade_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(allowance_amount >= 0 AND upgrade_amount >= 0)
);

CREATE INDEX idx_selection_options_sheet ON selection_options(selection_sheet_id);

-- =========================
-- SELECTION CHOICES
-- =========================
CREATE TABLE selection_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_sheet_id UUID NOT NULL REFERENCES selection_sheets(id) ON DELETE CASCADE,
  selection_option_id UUID NOT NULL REFERENCES selection_options(id) ON DELETE CASCADE,
  chosen_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  chosen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE INDEX idx_selection_choices_sheet ON selection_choices(selection_sheet_id);

-- =========================
-- ALLOWANCE RECONCILIATIONS
-- =========================
CREATE TABLE allowance_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  allowance_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  selected_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allowance_recon_project ON allowance_reconciliations(project_id);

-- =========================
-- CLOSEOUT PACKAGES
-- =========================
CREATE TABLE closeout_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','client_review','accepted','rejected')),
  checklist_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- DEFICIENCY ITEMS
-- =========================
CREATE TABLE deficiency_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  closeout_package_id UUID REFERENCES closeout_packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','verified','closed')),
  severity TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deficiency_items_project ON deficiency_items(project_id);

-- =========================
-- WARRANTY ITEMS
-- =========================
CREATE TABLE warranty_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES deficiency_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  provider_name TEXT,
  warranty_start DATE NOT NULL,
  warranty_end DATE NOT NULL,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(warranty_end >= warranty_start)
);

CREATE INDEX idx_warranty_items_project_end ON warranty_items(project_id, warranty_end);

-- =========================
-- SERVICE CALLS
-- =========================
CREATE TABLE service_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  warranty_item_id UUID REFERENCES warranty_items(id) ON DELETE SET NULL,
  call_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','scheduled','in_progress','resolved','closed','cancelled')),
  requested_by_portal_id UUID,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, call_number)
);

CREATE INDEX idx_service_calls_project_status ON service_calls(project_id, status);

-- =========================
-- SERVICE CALL EVENTS
-- =========================
CREATE TABLE service_call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_portal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_call_events_call ON service_call_events(service_call_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_selection_sheets_updated_at BEFORE UPDATE ON selection_sheets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_selection_options_updated_at BEFORE UPDATE ON selection_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_allowance_recon_updated_at BEFORE UPDATE ON allowance_reconciliations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_closeout_packages_updated_at BEFORE UPDATE ON closeout_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_deficiency_items_updated_at BEFORE UPDATE ON deficiency_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_warranty_items_updated_at BEFORE UPDATE ON warranty_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_calls_updated_at BEFORE UPDATE ON service_calls FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (project-member scoped)
-- =========================
ALTER TABLE selection_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deficiency_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY selection_sheets_select ON selection_sheets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = selection_sheets.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY selection_sheets_insert ON selection_sheets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = selection_sheets.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY selection_sheets_update ON selection_sheets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = selection_sheets.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY selection_options_select ON selection_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM selection_sheets ss JOIN project_members pm ON pm.project_id = ss.project_id WHERE ss.id = selection_options.selection_sheet_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY selection_options_insert ON selection_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM selection_sheets ss JOIN project_members pm ON pm.project_id = ss.project_id WHERE ss.id = selection_options.selection_sheet_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY selection_choices_select ON selection_choices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM selection_sheets ss JOIN project_members pm ON pm.project_id = ss.project_id WHERE ss.id = selection_choices.selection_sheet_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY selection_choices_insert ON selection_choices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM selection_sheets ss JOIN project_members pm ON pm.project_id = ss.project_id WHERE ss.id = selection_choices.selection_sheet_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY allowance_recon_select ON allowance_reconciliations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = allowance_reconciliations.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY allowance_recon_insert ON allowance_reconciliations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = allowance_reconciliations.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY closeout_packages_select ON closeout_packages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = closeout_packages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY closeout_packages_insert ON closeout_packages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = closeout_packages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY closeout_packages_update ON closeout_packages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = closeout_packages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY deficiency_items_select ON deficiency_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = deficiency_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY deficiency_items_insert ON deficiency_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = deficiency_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY deficiency_items_update ON deficiency_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = deficiency_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY warranty_items_select ON warranty_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = warranty_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY warranty_items_insert ON warranty_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = warranty_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY warranty_items_update ON warranty_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = warranty_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY service_calls_select ON service_calls FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = service_calls.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY service_calls_insert ON service_calls FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = service_calls.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY service_calls_update ON service_calls FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = service_calls.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY service_call_events_select ON service_call_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM service_calls sc JOIN project_members pm ON pm.project_id = sc.project_id WHERE sc.id = service_call_events.service_call_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY service_call_events_insert ON service_call_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM service_calls sc JOIN project_members pm ON pm.project_id = sc.project_id WHERE sc.id = service_call_events.service_call_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

COMMIT;
