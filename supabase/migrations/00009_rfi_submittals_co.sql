-- KrewPact RFI + Submittals + Change Orders Migration
-- Purpose: Field operations tables for construction project management
-- Depends on: 00003_crm_operations.sql (projects, project_members, users, contract_terms)

BEGIN;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE rfi_status AS ENUM ('open', 'responded', 'closed', 'void');
CREATE TYPE submittal_status AS ENUM ('draft', 'submitted', 'revise_and_resubmit', 'approved', 'approved_as_noted', 'rejected');
CREATE TYPE workflow_state AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'void');
CREATE TYPE co_status AS ENUM ('draft', 'submitted', 'client_review', 'approved', 'rejected', 'void');

-- =========================
-- RFI
-- =========================
CREATE TABLE rfi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfi_number TEXT NOT NULL,
  title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  status rfi_status NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responder_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, rfi_number)
);

CREATE INDEX idx_rfi_items_project ON rfi_items(project_id);
CREATE INDEX idx_rfi_items_status ON rfi_items(status);

CREATE TABLE rfi_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfi_items(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  is_official_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rfi_threads_rfi ON rfi_threads(rfi_id);

-- =========================
-- SUBMITTALS
-- =========================
CREATE TABLE submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submittal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status submittal_status NOT NULL DEFAULT 'draft',
  due_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, submittal_number)
);

CREATE INDEX idx_submittals_project ON submittals(project_id);
CREATE INDEX idx_submittals_status ON submittals(status);

CREATE TABLE submittal_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  outcome submittal_status NOT NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submittal_reviews_submittal ON submittal_reviews(submittal_id);

-- =========================
-- CHANGE REQUESTS + ORDERS
-- =========================
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state workflow_state NOT NULL DEFAULT 'draft',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  estimated_cost_impact NUMERIC(14,2) NOT NULL DEFAULT 0,
  estimated_days_impact INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, request_number)
);

CREATE INDEX idx_change_requests_project ON change_requests(project_id);

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
  co_number TEXT NOT NULL,
  status co_status NOT NULL DEFAULT 'draft',
  reason TEXT,
  amount_delta NUMERIC(14,2) NOT NULL DEFAULT 0,
  days_delta INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  signed_contract_id UUID REFERENCES contract_terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, co_number)
);

CREATE INDEX idx_change_orders_project ON change_orders(project_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_rfi_items_updated_at BEFORE UPDATE ON rfi_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_submittals_updated_at BEFORE UPDATE ON submittals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_change_requests_updated_at BEFORE UPDATE ON change_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_change_orders_updated_at BEFORE UPDATE ON change_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (project-member scoped)
-- =========================
ALTER TABLE rfi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfi_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE submittal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- RFI: Project-member scoped
CREATE POLICY rfi_items_select ON rfi_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = rfi_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfi_items_insert ON rfi_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = rfi_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfi_items_update ON rfi_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = rfi_items.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- RFI Threads: Inherit from RFI
CREATE POLICY rfi_threads_select ON rfi_threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM rfi_items r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = rfi_threads.rfi_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfi_threads_insert ON rfi_threads FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM rfi_items r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = rfi_threads.rfi_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Submittals: Project-member scoped
CREATE POLICY submittals_select ON submittals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = submittals.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY submittals_insert ON submittals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = submittals.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY submittals_update ON submittals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = submittals.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Submittal Reviews: Inherit from submittal
CREATE POLICY submittal_reviews_select ON submittal_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM submittals s JOIN project_members pm ON pm.project_id = s.project_id WHERE s.id = submittal_reviews.submittal_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY submittal_reviews_insert ON submittal_reviews FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM submittals s JOIN project_members pm ON pm.project_id = s.project_id WHERE s.id = submittal_reviews.submittal_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Change Requests: Project-member scoped
CREATE POLICY change_requests_select ON change_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = change_requests.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY change_requests_insert ON change_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = change_requests.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY change_requests_update ON change_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = change_requests.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Change Orders: Project-member scoped
CREATE POLICY change_orders_select ON change_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = change_orders.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY change_orders_insert ON change_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = change_orders.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY change_orders_update ON change_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = change_orders.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

COMMIT;
