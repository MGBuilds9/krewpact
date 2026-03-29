-- ============================================================
-- Restore migration sub-tables dropped in 20260328_001
-- Restores: migration_records, migration_conflicts, migration_attachments
-- migration_batches still exists — FKs will resolve
-- set_updated_at() already exists — not recreated
-- ============================================================

-- ============================================================
-- TABLE: migration_records
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_migration_records_batch_status
  ON migration_records(batch_id, status);

CREATE OR REPLACE TRIGGER trg_migration_records_updated_at
  BEFORE UPDATE ON migration_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: migration_conflicts
-- Includes two denormalized columns required by the conflicts route:
--   batch_id  — route filters .eq('batch_id', batchId)
--   entity_type — route filters .eq('entity_type', entity_type)
-- ============================================================
CREATE TABLE IF NOT EXISTS migration_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES migration_records(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES migration_batches(id) ON DELETE CASCADE,
  entity_type TEXT,
  conflict_type TEXT NOT NULL,
  conflict_payload JSONB NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_conflicts_batch
  ON migration_conflicts(batch_id, resolution_status);

-- ============================================================
-- TABLE: migration_attachments
-- target_file_id is a plain UUID reference (no FK) — per original schema
-- ============================================================
CREATE TABLE IF NOT EXISTS migration_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES migration_records(id) ON DELETE CASCADE,
  source_file_path TEXT NOT NULL,
  target_file_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','dead_letter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_migration_attachments_updated_at
  BEFORE UPDATE ON migration_attachments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS — admin-scoped policies on all three tables
-- ============================================================

-- migration_records
ALTER TABLE migration_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_records_admin_select" ON migration_records
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

CREATE POLICY "migration_records_admin_insert" ON migration_records
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

CREATE POLICY "migration_records_admin_update" ON migration_records
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

-- migration_conflicts
ALTER TABLE migration_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_conflicts_admin_select" ON migration_conflicts
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

CREATE POLICY "migration_conflicts_admin_insert" ON migration_conflicts
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

CREATE POLICY "migration_conflicts_admin_update" ON migration_conflicts
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

-- migration_attachments
ALTER TABLE migration_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_attachments_admin_select" ON migration_attachments
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

CREATE POLICY "migration_attachments_admin_insert" ON migration_attachments
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');

CREATE POLICY "migration_attachments_admin_update" ON migration_attachments
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role_keys')::jsonb ? 'platform_admin');
