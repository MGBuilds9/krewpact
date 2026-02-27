-- KrewPact Estimating Extended Migration
-- Purpose: Cost catalog, assemblies, estimate templates, alternates, allowances
-- Depends on: 00003_crm_operations.sql (estimates, estimate_lines, divisions, users)

BEGIN;

-- =========================
-- COST CATALOG
-- =========================
CREATE TABLE cost_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  item_code TEXT,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  base_cost NUMERIC(14,4) NOT NULL,
  vendor_name TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_catalog_items_division ON cost_catalog_items(division_id);
CREATE INDEX idx_catalog_items_code ON cost_catalog_items(item_code);
CREATE INDEX idx_catalog_items_type ON cost_catalog_items(item_type);

-- =========================
-- ASSEMBLIES
-- =========================
CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  assembly_code TEXT,
  assembly_name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assemblies_division ON assemblies(division_id);
CREATE INDEX idx_assemblies_code ON assemblies(assembly_code);

CREATE TABLE assembly_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES cost_catalog_items(id) ON DELETE SET NULL,
  line_type TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assembly_items_assembly ON assembly_items(assembly_id);

-- =========================
-- ESTIMATE TEMPLATES
-- =========================
CREATE TABLE estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  project_type TEXT,
  payload JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estimate_templates_division ON estimate_templates(division_id);

-- =========================
-- ESTIMATE ALTERNATES
-- =========================
CREATE TABLE estimate_alternates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estimate_alternates_estimate ON estimate_alternates(estimate_id);

-- =========================
-- ESTIMATE ALLOWANCES
-- =========================
CREATE TABLE estimate_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  allowance_name TEXT NOT NULL,
  allowance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estimate_allowances_estimate ON estimate_allowances(estimate_id);

-- =========================
-- TRIGGERS (updated_at)
-- =========================
CREATE TRIGGER trg_catalog_updated_at BEFORE UPDATE ON cost_catalog_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assemblies_updated_at BEFORE UPDATE ON assemblies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assembly_items_updated_at BEFORE UPDATE ON assembly_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON estimate_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_alternates_updated_at BEFORE UPDATE ON estimate_alternates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_allowances_updated_at BEFORE UPDATE ON estimate_allowances FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (deny-by-default)
-- =========================
ALTER TABLE cost_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_alternates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_allowances ENABLE ROW LEVEL SECURITY;

-- COST CATALOG: Division-scoped
CREATE POLICY catalog_items_select ON cost_catalog_items
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR division_id IS NULL
    OR public.is_platform_admin()
  );

CREATE POLICY catalog_items_insert ON cost_catalog_items
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR division_id IS NULL
    OR public.is_platform_admin()
  );

CREATE POLICY catalog_items_update ON cost_catalog_items
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY catalog_items_delete ON cost_catalog_items
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ASSEMBLIES: Division-scoped
CREATE POLICY assemblies_select ON assemblies
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR division_id IS NULL
    OR public.is_platform_admin()
  );

CREATE POLICY assemblies_insert ON assemblies
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR division_id IS NULL
    OR public.is_platform_admin()
  );

CREATE POLICY assemblies_update ON assemblies
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY assemblies_delete ON assemblies
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ASSEMBLY ITEMS: Inherit from parent assembly (cascading)
CREATE POLICY assembly_items_select ON assembly_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assemblies a WHERE a.id = assembly_items.assembly_id
      AND (
        a.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR a.division_id IS NULL
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY assembly_items_insert ON assembly_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assemblies a WHERE a.id = assembly_items.assembly_id
      AND (
        a.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR a.division_id IS NULL
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY assembly_items_update ON assembly_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assemblies a WHERE a.id = assembly_items.assembly_id
      AND (
        a.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY assembly_items_delete ON assembly_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assemblies a WHERE a.id = assembly_items.assembly_id
      AND public.is_platform_admin()
    )
  );

-- ESTIMATE TEMPLATES: Division-scoped
CREATE POLICY estimate_templates_select ON estimate_templates
  FOR SELECT TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR division_id IS NULL
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_templates_insert ON estimate_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR division_id IS NULL
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_templates_update ON estimate_templates
  FOR UPDATE TO authenticated
  USING (
    division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
    OR public.is_platform_admin()
  );

CREATE POLICY estimate_templates_delete ON estimate_templates
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ESTIMATE ALTERNATES: Inherit from parent estimate
CREATE POLICY estimate_alternates_select ON estimate_alternates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_alternates.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY estimate_alternates_insert ON estimate_alternates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_alternates.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY estimate_alternates_update ON estimate_alternates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_alternates.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY estimate_alternates_delete ON estimate_alternates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_alternates.estimate_id
      AND public.is_platform_admin()
    )
  );

-- ESTIMATE ALLOWANCES: Inherit from parent estimate
CREATE POLICY estimate_allowances_select ON estimate_allowances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_allowances.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY estimate_allowances_insert ON estimate_allowances
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_allowances.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY estimate_allowances_update ON estimate_allowances
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_allowances.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY estimate_allowances_delete ON estimate_allowances
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = estimate_allowances.estimate_id
      AND public.is_platform_admin()
    )
  );

COMMIT;
