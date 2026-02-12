-- KrewPact RLS Policies
-- Purpose: Row-Level Security for foundation tables using Clerk JWT claims
-- JWT claims: krewpact_user_id, krewpact_divisions (JSONB array), krewpact_roles (JSONB array)

BEGIN;

-- =========================
-- ENABLE RLS (deny-by-default)
-- =========================
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================
-- HELPER FUNCTIONS (public schema — auth schema is reserved by Supabase)
-- =========================
CREATE OR REPLACE FUNCTION public.krewpact_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'krewpact_user_id',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.krewpact_roles()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'krewpact_roles')::jsonb,
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.krewpact_divisions()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'krewpact_divisions')::jsonb,
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.krewpact_roles() ? 'platform_admin';
$$;

-- =========================
-- DIVISIONS: all authenticated can read, only platform_admin can modify
-- =========================
CREATE POLICY divisions_select ON divisions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY divisions_insert ON divisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY divisions_update ON divisions
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY divisions_delete ON divisions
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- =========================
-- ROLES: all authenticated can read, only platform_admin can modify
-- =========================
CREATE POLICY roles_select ON roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY roles_insert ON roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY roles_update ON roles
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- =========================
-- USERS: read own profile, platform_admin reads all
-- =========================
CREATE POLICY users_select_own ON users
  FOR SELECT TO authenticated
  USING (
    id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id::text = public.krewpact_user_id())
  WITH CHECK (id::text = public.krewpact_user_id());

CREATE POLICY users_insert_admin ON users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY users_delete_admin ON users
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- =========================
-- USER_ROLES: read own roles, platform_admin manages all
-- =========================
CREATE POLICY user_roles_select ON user_roles
  FOR SELECT TO authenticated
  USING (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY user_roles_delete ON user_roles
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- =========================
-- USER_DIVISIONS: read own divisions, platform_admin manages all
-- =========================
CREATE POLICY user_divisions_select ON user_divisions
  FOR SELECT TO authenticated
  USING (
    user_id::text = public.krewpact_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY user_divisions_insert ON user_divisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY user_divisions_update ON user_divisions
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY user_divisions_delete ON user_divisions
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- =========================
-- AUDIT_LOGS: platform_admin + executive can read, insert-only for system
-- =========================
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.krewpact_roles() ? 'executive'
  );

-- All authenticated users can insert audit logs (tracking their own actions)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No update or delete on audit logs (immutable)

COMMIT;
