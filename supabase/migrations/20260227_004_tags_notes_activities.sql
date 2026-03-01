-- KrewPact Migration: Tags, Notes, and Activity Enhancements
-- Sprint 4: Rich contextual data for CRM entities

BEGIN;

-- =========================
-- TAGS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_division
  ON tags(name, COALESCE(division_id, '00000000-0000-0000-0000-000000000000'));

-- =========================
-- ENTITY_TAGS JUNCTION TABLE
-- =========================
CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'account', 'opportunity')),
  entity_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags(tag_id);

-- =========================
-- NOTES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'account', 'opportunity')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_notes_updated_at ON notes;
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- ACTIVITY ENHANCEMENTS
-- =========================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS disposition TEXT;

-- =========================
-- RLS POLICIES
-- =========================

-- Tags: all authenticated can read, admin/ops_manager can write
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY tags_insert ON tags
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
    OR public.krewpact_roles() ? 'project_manager'
  );

CREATE POLICY tags_update ON tags
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

CREATE POLICY tags_delete ON tags
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'operations_manager'
  );

-- Entity Tags: all authenticated can read/write (controlled by parent entity RLS)
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_tags_select ON entity_tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY entity_tags_insert ON entity_tags
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY entity_tags_delete ON entity_tags
  FOR DELETE TO authenticated
  USING (true);

-- Notes: all authenticated can read, author can update/delete
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select ON notes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY notes_insert ON notes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY notes_update ON notes
  FOR UPDATE TO authenticated
  USING (
    created_by::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    created_by::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY notes_delete ON notes
  FOR DELETE TO authenticated
  USING (
    created_by::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

COMMIT;
