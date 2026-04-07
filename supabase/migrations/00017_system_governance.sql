-- KrewPact System + Governance Migration
-- Purpose: Webhooks, idempotency, reference data, privacy, BCP, migration
-- Depends on: 00003_crm_operations.sql (users, divisions, projects)

BEGIN;

-- =========================
-- WEBHOOK EVENTS
-- =========================
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received',
  processing_error TEXT,
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhook_events_provider_status ON webhook_events(provider, processing_status, received_at DESC);

-- =========================
-- IDEMPOTENCY KEYS
-- =========================
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value TEXT UNIQUE NOT NULL,
  endpoint TEXT NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_hash TEXT NOT NULL,
  response_code INTEGER,
  response_body JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- REFERENCE DATA
-- =========================
CREATE TABLE reference_data_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_key TEXT UNIQUE NOT NULL,
  set_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','deprecated','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reference_data_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_set_id UUID NOT NULL REFERENCES reference_data_sets(id) ON DELETE CASCADE,
  value_key TEXT NOT NULL,
  value_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(data_set_id, value_key)
);

CREATE INDEX idx_reference_data_values_set ON reference_data_values(data_set_id);

-- =========================
-- PRIVACY REQUESTS
-- =========================
CREATE TABLE privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email CITEXT NOT NULL,
  requester_name TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('access','correction','deletion','export')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','verified','in_progress','completed','rejected')),
  legal_basis TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  handled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_privacy_requests_status_due ON privacy_requests(status, due_at);

CREATE TABLE privacy_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privacy_request_id UUID NOT NULL REFERENCES privacy_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- BCP INCIDENTS
-- =========================
CREATE TABLE bcp_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('sev1','sev2','sev3','sev4')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigating','monitoring','resolved','closed')),
  title TEXT NOT NULL,
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bcp_incidents_status_severity ON bcp_incidents(status, severity);

CREATE TABLE bcp_recovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES bcp_incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- FEATURE USAGE + ADOPTION
-- =========================
CREATE TABLE feature_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  portal_account_id UUID,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feature_usage_name_time ON feature_usage_events(event_name, occurred_at DESC);

CREATE TABLE adoption_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  dimension JSONB NOT NULL DEFAULT '{}'::jsonb,
  metric_value NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, metric_name, dimension)
);

-- =========================
-- MIGRATION
-- =========================
CREATE TABLE migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','dead_letter')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  summary JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','dead_letter')),
  source_payload JSONB,
  transform_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, source_type, source_key)
);

CREATE INDEX idx_migration_records_batch_status ON migration_records(batch_id, status);

CREATE TABLE IF NOT EXISTS migration_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES migration_records(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  conflict_payload JSONB NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES migration_records(id) ON DELETE CASCADE,
  source_file_path TEXT NOT NULL,
  target_file_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','dead_letter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_reference_sets_updated_at BEFORE UPDATE ON reference_data_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reference_values_updated_at BEFORE UPDATE ON reference_data_values FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_privacy_requests_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bcp_incidents_updated_at BEFORE UPDATE ON bcp_incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_migration_batches_updated_at BEFORE UPDATE ON migration_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_migration_records_updated_at BEFORE UPDATE ON migration_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_migration_attachments_updated_at BEFORE UPDATE ON migration_attachments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (admin-scoped for most system tables)
-- =========================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_data_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_data_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcp_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcp_recovery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoption_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_attachments ENABLE ROW LEVEL SECURITY;

-- Webhook events: Admin only
CREATE POLICY webhook_events_select ON webhook_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY webhook_events_insert ON webhook_events FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

-- Idempotency: Admin only
CREATE POLICY idempotency_keys_select ON idempotency_keys FOR SELECT TO authenticated USING (public.is_platform_admin());

-- Reference data: All authenticated can read
CREATE POLICY reference_data_sets_select ON reference_data_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY reference_data_sets_insert ON reference_data_sets FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY reference_data_sets_update ON reference_data_sets FOR UPDATE TO authenticated USING (public.is_platform_admin());

CREATE POLICY reference_data_values_select ON reference_data_values FOR SELECT TO authenticated USING (true);
CREATE POLICY reference_data_values_insert ON reference_data_values FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY reference_data_values_update ON reference_data_values FOR UPDATE TO authenticated USING (public.is_platform_admin());

-- Privacy: Admin only
CREATE POLICY privacy_requests_select ON privacy_requests FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY privacy_requests_insert ON privacy_requests FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY privacy_requests_update ON privacy_requests FOR UPDATE TO authenticated USING (public.is_platform_admin());
CREATE POLICY privacy_request_events_select ON privacy_request_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY privacy_request_events_insert ON privacy_request_events FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

-- BCP: Admin only
CREATE POLICY bcp_incidents_select ON bcp_incidents FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY bcp_incidents_insert ON bcp_incidents FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY bcp_incidents_update ON bcp_incidents FOR UPDATE TO authenticated USING (public.is_platform_admin());
CREATE POLICY bcp_recovery_events_select ON bcp_recovery_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY bcp_recovery_events_insert ON bcp_recovery_events FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

-- Feature usage: Admin only
CREATE POLICY feature_usage_events_select ON feature_usage_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY feature_usage_events_insert ON feature_usage_events FOR INSERT TO authenticated WITH CHECK (true);

-- Adoption KPIs: Admin only
CREATE POLICY adoption_kpis_select ON adoption_kpis FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY adoption_kpis_insert ON adoption_kpis FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

-- Migration: Admin only
CREATE POLICY migration_batches_select ON migration_batches FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY migration_batches_insert ON migration_batches FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY migration_batches_update ON migration_batches FOR UPDATE TO authenticated USING (public.is_platform_admin());
CREATE POLICY migration_records_select ON migration_records FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY migration_conflicts_select ON migration_conflicts FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY migration_conflicts_update ON migration_conflicts FOR UPDATE TO authenticated USING (public.is_platform_admin());

COMMIT;
