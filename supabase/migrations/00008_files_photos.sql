-- KrewPact Files + Photos Migration
-- Purpose: Document management, file versioning, photo assets
-- Depends on: 00003_crm_operations.sql (projects, project_members, users)

BEGIN;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE file_visibility AS ENUM ('internal', 'client', 'trade', 'public');

-- =========================
-- FILE FOLDERS
-- =========================
CREATE TABLE file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  visibility file_visibility NOT NULL DEFAULT 'internal',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, folder_path)
);

CREATE INDEX idx_file_folders_project ON file_folders(project_id);

-- =========================
-- FILE METADATA
-- =========================
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT,
  version_no INTEGER NOT NULL DEFAULT 1,
  visibility file_visibility NOT NULL DEFAULT 'internal',
  tags TEXT[],
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  source_system TEXT,
  source_identifier TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(storage_bucket, file_path)
);

CREATE INDEX idx_file_metadata_project ON file_metadata(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_file_metadata_tags ON file_metadata USING GIN(tags);

-- =========================
-- FILE VERSIONS
-- =========================
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  storage_bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  checksum_sha256 TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(file_id, version_no)
);

CREATE INDEX idx_file_versions_file ON file_versions(file_id);

-- =========================
-- FILE SHARES
-- =========================
CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_portal_actor_id UUID,
  permission_level TEXT NOT NULL DEFAULT 'read',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_shares_file ON file_shares(file_id);

-- =========================
-- PROJECT FILES (junction)
-- =========================
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  linked_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, file_id)
);

CREATE INDEX idx_project_files_project ON project_files(project_id);

-- =========================
-- PHOTO ASSETS
-- =========================
CREATE TABLE photo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ,
  location_point JSONB,
  category TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photo_assets_project ON photo_assets(project_id);

-- =========================
-- PHOTO ANNOTATIONS
-- =========================
CREATE TABLE photo_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photo_assets(id) ON DELETE CASCADE,
  annotation_json JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photo_annotations_photo ON photo_annotations(photo_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_file_folders_updated_at BEFORE UPDATE ON file_folders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_file_metadata_updated_at BEFORE UPDATE ON file_metadata FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS (project-member scoped)
-- =========================
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;

-- FILE FOLDERS: Project-member scoped
CREATE POLICY file_folders_select ON file_folders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = file_folders.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY file_folders_insert ON file_folders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = file_folders.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY file_folders_update ON file_folders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = file_folders.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- FILE METADATA: Project-member scoped
CREATE POLICY file_metadata_select ON file_metadata FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = file_metadata.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY file_metadata_insert ON file_metadata FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = file_metadata.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY file_metadata_update ON file_metadata FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = file_metadata.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- FILE VERSIONS: Inherit from file → project
CREATE POLICY file_versions_select ON file_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM file_metadata f JOIN project_members pm ON pm.project_id = f.project_id WHERE f.id = file_versions.file_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY file_versions_insert ON file_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM file_metadata f JOIN project_members pm ON pm.project_id = f.project_id WHERE f.id = file_versions.file_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- FILE SHARES: Inherit from file → project
CREATE POLICY file_shares_select ON file_shares FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM file_metadata f JOIN project_members pm ON pm.project_id = f.project_id WHERE f.id = file_shares.file_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY file_shares_insert ON file_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM file_metadata f JOIN project_members pm ON pm.project_id = f.project_id WHERE f.id = file_shares.file_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- PROJECT FILES: Project-member scoped
CREATE POLICY project_files_select ON project_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_files.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY project_files_insert ON project_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_files.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- PHOTO ASSETS: Project-member scoped
CREATE POLICY photo_assets_select ON photo_assets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = photo_assets.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY photo_assets_insert ON photo_assets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = photo_assets.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- PHOTO ANNOTATIONS: Inherit from photo → project
CREATE POLICY photo_annotations_select ON photo_annotations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM photo_assets pa JOIN project_members pm ON pm.project_id = pa.project_id WHERE pa.id = photo_annotations.photo_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY photo_annotations_insert ON photo_annotations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM photo_assets pa JOIN project_members pm ON pm.project_id = pa.project_id WHERE pa.id = photo_annotations.photo_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

COMMIT;
