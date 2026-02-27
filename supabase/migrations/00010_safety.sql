-- KrewPact Safety Migration
-- Purpose: Safety forms, incidents, toolbox talks, inspections
-- Depends on: 00003_crm_operations.sql (projects, project_members, users)
-- Depends on: 00009_rfi_submittals_co.sql (workflow_state enum)

BEGIN;

-- =========================
-- SAFETY FORMS
-- =========================
CREATE TABLE safety_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  form_date DATE NOT NULL,
  state workflow_state NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_forms_project ON safety_forms(project_id);

-- =========================
-- SAFETY INCIDENTS
-- =========================
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  incident_date TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  corrective_actions JSONB,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_incidents_project ON safety_incidents(project_id);

-- =========================
-- TOOLBOX TALKS
-- =========================
CREATE TABLE toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  talk_date DATE NOT NULL,
  topic TEXT NOT NULL,
  facilitator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  attendee_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_toolbox_talks_project ON toolbox_talks(project_id);

-- =========================
-- INSPECTIONS
-- =========================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  state workflow_state NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  inspector_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspections_project ON inspections(project_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_safety_forms_updated_at BEFORE UPDATE ON safety_forms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_safety_incidents_updated_at BEFORE UPDATE ON safety_incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_toolbox_talks_updated_at BEFORE UPDATE ON toolbox_talks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (project-member scoped)
-- =========================
ALTER TABLE safety_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY safety_forms_select ON safety_forms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = safety_forms.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY safety_forms_insert ON safety_forms FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = safety_forms.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY safety_forms_update ON safety_forms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = safety_forms.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY safety_incidents_select ON safety_incidents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = safety_incidents.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY safety_incidents_insert ON safety_incidents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = safety_incidents.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY safety_incidents_update ON safety_incidents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = safety_incidents.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY toolbox_talks_select ON toolbox_talks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = toolbox_talks.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY toolbox_talks_insert ON toolbox_talks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = toolbox_talks.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY toolbox_talks_update ON toolbox_talks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = toolbox_talks.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY inspections_select ON inspections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = inspections.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY inspections_insert ON inspections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = inspections.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY inspections_update ON inspections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = inspections.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

COMMIT;
