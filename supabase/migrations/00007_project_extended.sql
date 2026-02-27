-- KrewPact Project Execution Extended Migration
-- Purpose: Task dependencies, site diary entries
-- Depends on: 00003_crm_operations.sql (projects, tasks, users)
-- Note: task_comments and project_daily_logs already exist in 00003

BEGIN;

-- =========================
-- TASK DEPENDENCIES
-- =========================
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends_on ON task_dependencies(depends_on_task_id);

-- =========================
-- SITE DIARY
-- =========================
CREATE TABLE site_diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_at TIMESTAMPTZ NOT NULL,
  entry_type TEXT NOT NULL,
  entry_text TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_site_diary_project ON site_diary_entries(project_id);
CREATE INDEX idx_site_diary_date ON site_diary_entries(entry_at);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_site_diary_updated_at BEFORE UPDATE ON site_diary_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_diary_entries ENABLE ROW LEVEL SECURITY;

-- TASK DEPENDENCIES: Project-member scoped (inherit from task → project)
CREATE POLICY task_deps_select ON task_dependencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id
      AND pm.user_id = public.krewpact_user_id()::uuid
    )
    OR public.is_platform_admin()
  );

CREATE POLICY task_deps_insert ON task_dependencies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id
      AND pm.user_id = public.krewpact_user_id()::uuid
    )
    OR public.is_platform_admin()
  );

CREATE POLICY task_deps_delete ON task_dependencies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id
      AND pm.user_id = public.krewpact_user_id()::uuid
    )
    OR public.is_platform_admin()
  );

-- SITE DIARY: Project-member scoped
CREATE POLICY site_diary_select ON site_diary_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = site_diary_entries.project_id
      AND pm.user_id = public.krewpact_user_id()::uuid
    )
    OR public.is_platform_admin()
  );

CREATE POLICY site_diary_insert ON site_diary_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = site_diary_entries.project_id
      AND pm.user_id = public.krewpact_user_id()::uuid
    )
    OR public.is_platform_admin()
  );

CREATE POLICY site_diary_update ON site_diary_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = site_diary_entries.project_id
      AND pm.user_id = public.krewpact_user_id()::uuid
    )
    OR public.is_platform_admin()
  );

CREATE POLICY site_diary_delete ON site_diary_entries
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

COMMIT;
