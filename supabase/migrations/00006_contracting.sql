-- KrewPact Contracting + E-Sign Migration
-- Purpose: Proposals, contract terms, e-sign envelopes/documents
-- Depends on: 00003_crm_operations.sql (estimates, users, divisions)

BEGIN;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'superseded');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_signature', 'signed', 'amended', 'terminated');

-- =========================
-- PROPOSALS
-- =========================
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  proposal_number TEXT UNIQUE NOT NULL,
  status proposal_status NOT NULL DEFAULT 'draft',
  proposal_payload JSONB NOT NULL,
  expires_on DATE,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposals_estimate ON proposals(estimate_id);
CREATE INDEX idx_proposals_status ON proposals(status);

CREATE TABLE proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_proposal_events_proposal ON proposal_events(proposal_id);

-- =========================
-- CONTRACT TERMS
-- =========================
CREATE TABLE contract_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  contract_status contract_status NOT NULL DEFAULT 'draft',
  legal_text_version TEXT NOT NULL,
  terms_payload JSONB NOT NULL,
  signed_at TIMESTAMPTZ,
  supersedes_contract_id UUID REFERENCES contract_terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_terms_proposal ON contract_terms(proposal_id);
CREATE INDEX idx_contract_terms_status ON contract_terms(contract_status);

-- =========================
-- E-SIGN
-- =========================
CREATE TABLE esign_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'boldsign',
  provider_envelope_id TEXT UNIQUE,
  contract_id UUID NOT NULL REFERENCES contract_terms(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  signer_count INTEGER NOT NULL DEFAULT 0,
  webhook_last_event_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_esign_envelopes_contract ON esign_envelopes(contract_id);
CREATE INDEX idx_esign_envelopes_provider ON esign_envelopes(provider_envelope_id);

CREATE TABLE esign_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES esign_envelopes(id) ON DELETE CASCADE,
  file_id UUID,
  certificate_file_id UUID,
  checksum_sha256 TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_esign_documents_envelope ON esign_documents(envelope_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contract_terms_updated_at BEFORE UPDATE ON contract_terms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_esign_envelopes_updated_at BEFORE UPDATE ON esign_envelopes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE esign_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE esign_documents ENABLE ROW LEVEL SECURITY;

-- PROPOSALS: Inherit from parent estimate's division
CREATE POLICY proposals_select ON proposals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = proposals.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY proposals_insert ON proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = proposals.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY proposals_update ON proposals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = proposals.estimate_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY proposals_delete ON proposals
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e WHERE e.id = proposals.estimate_id
      AND public.is_platform_admin()
    )
  );

-- PROPOSAL EVENTS: Inherit from parent proposal
CREATE POLICY proposal_events_select ON proposal_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN estimates e ON e.id = p.estimate_id
      WHERE p.id = proposal_events.proposal_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY proposal_events_insert ON proposal_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN estimates e ON e.id = p.estimate_id
      WHERE p.id = proposal_events.proposal_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

-- CONTRACT TERMS: Inherit from parent proposal → estimate
CREATE POLICY contract_terms_select ON contract_terms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN estimates e ON e.id = p.estimate_id
      WHERE p.id = contract_terms.proposal_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY contract_terms_insert ON contract_terms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN estimates e ON e.id = p.estimate_id
      WHERE p.id = contract_terms.proposal_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY contract_terms_update ON contract_terms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN estimates e ON e.id = p.estimate_id
      WHERE p.id = contract_terms.proposal_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

-- ESIGN ENVELOPES: Inherit from contract → proposal → estimate
CREATE POLICY esign_envelopes_select ON esign_envelopes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contract_terms ct
      JOIN proposals p ON p.id = ct.proposal_id
      JOIN estimates e ON e.id = p.estimate_id
      WHERE ct.id = esign_envelopes.contract_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY esign_envelopes_insert ON esign_envelopes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contract_terms ct
      JOIN proposals p ON p.id = ct.proposal_id
      JOIN estimates e ON e.id = p.estimate_id
      WHERE ct.id = esign_envelopes.contract_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

-- ESIGN DOCUMENTS: Inherit from envelope
CREATE POLICY esign_documents_select ON esign_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM esign_envelopes env
      JOIN contract_terms ct ON ct.id = env.contract_id
      JOIN proposals p ON p.id = ct.proposal_id
      JOIN estimates e ON e.id = p.estimate_id
      WHERE env.id = esign_documents.envelope_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

CREATE POLICY esign_documents_insert ON esign_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM esign_envelopes env
      JOIN contract_terms ct ON ct.id = env.contract_id
      JOIN proposals p ON p.id = ct.proposal_id
      JOIN estimates e ON e.id = p.estimate_id
      WHERE env.id = esign_documents.envelope_id
      AND (
        e.division_id::text IN (SELECT jsonb_array_elements_text(public.krewpact_divisions()))
        OR public.is_platform_admin()
      )
    )
  );

COMMIT;
