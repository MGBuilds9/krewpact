-- KrewPact Procurement Migration
-- Purpose: RFQ packages, bids, leveling, compliance, cost codes
-- Depends on: 00003_crm_operations.sql (projects, project_members, users, divisions)

BEGIN;

-- =========================
-- COST CODE DICTIONARY
-- =========================
CREATE TABLE cost_code_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  cost_code TEXT NOT NULL,
  cost_code_name TEXT NOT NULL,
  parent_cost_code_id UUID REFERENCES cost_code_dictionary(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(division_id, cost_code)
);

CREATE INDEX idx_cost_code_dictionary_division ON cost_code_dictionary(division_id);

-- =========================
-- COST CODE MAPPINGS
-- =========================
CREATE TABLE cost_code_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  local_cost_code TEXT NOT NULL,
  erp_cost_code TEXT NOT NULL,
  adp_labor_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(division_id, local_cost_code)
);

CREATE INDEX idx_cost_code_mappings_division ON cost_code_mappings(division_id);

-- =========================
-- RFQ PACKAGES
-- =========================
CREATE TABLE rfq_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  scope_summary TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','closed','awarded','cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, rfq_number)
);

CREATE INDEX idx_rfq_packages_project_status ON rfq_packages(project_id, status);

-- =========================
-- RFQ INVITES
-- =========================
CREATE TABLE rfq_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_packages(id) ON DELETE CASCADE,
  portal_account_id UUID,
  invited_email TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','opened','declined','submitted'))
);

CREATE INDEX idx_rfq_invites_rfq ON rfq_invites(rfq_id);

-- =========================
-- RFQ BIDS
-- =========================
CREATE TABLE rfq_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_packages(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES rfq_invites(id) ON DELETE SET NULL,
  submitted_by_portal_id UUID,
  submitted_at TIMESTAMPTZ,
  currency_code CHAR(3) NOT NULL DEFAULT 'CAD',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  exclusions TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','awarded','rejected','withdrawn')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

CREATE INDEX idx_rfq_bids_rfq_status ON rfq_bids(rfq_id, status);

-- =========================
-- BID LEVELING
-- =========================
CREATE TABLE bid_leveling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_packages(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rfq_id, version_no)
);

CREATE TABLE bid_leveling_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leveling_session_id UUID NOT NULL REFERENCES bid_leveling_sessions(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES rfq_bids(id) ON DELETE CASCADE,
  normalized_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  risk_score NUMERIC(6,3),
  recommended BOOLEAN NOT NULL DEFAULT FALSE,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bid_leveling_entries_session ON bid_leveling_entries(leveling_session_id);

-- =========================
-- TRADE PARTNER COMPLIANCE
-- =========================
CREATE TABLE trade_partner_compliance_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id UUID NOT NULL,
  compliance_type TEXT NOT NULL,
  file_id UUID,
  doc_number TEXT,
  issued_on DATE,
  expires_on DATE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring','expired','rejected')),
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_compliance_status_expiry ON trade_partner_compliance_docs(status, expires_on);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_cost_codes_updated_at BEFORE UPDATE ON cost_code_dictionary FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cost_code_mappings_updated_at BEFORE UPDATE ON cost_code_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rfq_packages_updated_at BEFORE UPDATE ON rfq_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rfq_bids_updated_at BEFORE UPDATE ON rfq_bids FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_leveling_entries_updated_at BEFORE UPDATE ON bid_leveling_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_trade_compliance_updated_at BEFORE UPDATE ON trade_partner_compliance_docs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE cost_code_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_code_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_leveling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_leveling_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_partner_compliance_docs ENABLE ROW LEVEL SECURITY;

-- Cost codes: Division-scoped
CREATE POLICY cost_codes_select ON cost_code_dictionary FOR SELECT TO authenticated
  USING (cost_code_dictionary.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());
CREATE POLICY cost_codes_insert ON cost_code_dictionary FOR INSERT TO authenticated
  WITH CHECK (cost_code_dictionary.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());
CREATE POLICY cost_codes_update ON cost_code_dictionary FOR UPDATE TO authenticated
  USING (cost_code_dictionary.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());

CREATE POLICY cost_code_mappings_select ON cost_code_mappings FOR SELECT TO authenticated
  USING (cost_code_mappings.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());
CREATE POLICY cost_code_mappings_insert ON cost_code_mappings FOR INSERT TO authenticated
  WITH CHECK (cost_code_mappings.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions())) OR public.is_platform_admin());

-- RFQ: Project-member scoped
CREATE POLICY rfq_packages_select ON rfq_packages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = rfq_packages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfq_packages_insert ON rfq_packages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = rfq_packages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfq_packages_update ON rfq_packages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = rfq_packages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- RFQ Invites: Inherit from RFQ
CREATE POLICY rfq_invites_select ON rfq_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM rfq_packages r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = rfq_invites.rfq_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfq_invites_insert ON rfq_invites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM rfq_packages r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = rfq_invites.rfq_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- RFQ Bids: Inherit from RFQ
CREATE POLICY rfq_bids_select ON rfq_bids FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM rfq_packages r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = rfq_bids.rfq_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY rfq_bids_insert ON rfq_bids FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM rfq_packages r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = rfq_bids.rfq_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Bid leveling: Inherit from RFQ
CREATE POLICY bid_leveling_sessions_select ON bid_leveling_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM rfq_packages r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = bid_leveling_sessions.rfq_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY bid_leveling_sessions_insert ON bid_leveling_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM rfq_packages r JOIN project_members pm ON pm.project_id = r.project_id WHERE r.id = bid_leveling_sessions.rfq_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

CREATE POLICY bid_leveling_entries_select ON bid_leveling_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM bid_leveling_sessions bs JOIN rfq_packages r ON r.id = bs.rfq_id JOIN project_members pm ON pm.project_id = r.project_id WHERE bs.id = bid_leveling_entries.leveling_session_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY bid_leveling_entries_insert ON bid_leveling_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM bid_leveling_sessions bs JOIN rfq_packages r ON r.id = bs.rfq_id JOIN project_members pm ON pm.project_id = r.project_id WHERE bs.id = bid_leveling_entries.leveling_session_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Trade compliance: Admin only
CREATE POLICY trade_compliance_select ON trade_partner_compliance_docs FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY trade_compliance_insert ON trade_partner_compliance_docs FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY trade_compliance_update ON trade_partner_compliance_docs FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

COMMIT;
