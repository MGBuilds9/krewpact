-- KrewPact Org Permissions + Notifications Migration
-- Purpose: Fine-grained permissions, role-permission mapping, notification preferences
-- Depends on: 00003_crm_operations.sql (users, roles, divisions)

BEGIN;

-- =========================
-- PERMISSIONS
-- =========================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- ROLE PERMISSIONS
-- =========================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- =========================
-- POLICY OVERRIDES
-- =========================
CREATE TABLE policy_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  override_value BOOLEAN NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_overrides_user ON policy_overrides(user_id);

-- =========================
-- NOTIFICATION PREFERENCES
-- =========================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_policy_overrides_updated_at BEFORE UPDATE ON policy_overrides FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Permissions: All authenticated can read
CREATE POLICY permissions_select ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY permissions_insert ON permissions FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

-- Role permissions: All authenticated can read, admin can write
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_permissions_insert ON role_permissions FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY role_permissions_update ON role_permissions FOR UPDATE TO authenticated USING (public.is_platform_admin());
CREATE POLICY role_permissions_delete ON role_permissions FOR DELETE TO authenticated USING (public.is_platform_admin());

-- Policy overrides: Admin only
CREATE POLICY policy_overrides_select ON policy_overrides FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY policy_overrides_insert ON policy_overrides FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY policy_overrides_update ON policy_overrides FOR UPDATE TO authenticated USING (public.is_platform_admin());

-- Notification preferences: Own record only
CREATE POLICY notification_preferences_select ON notification_preferences FOR SELECT TO authenticated
  USING (notification_preferences.user_id = public.krewpact_user_id()::uuid OR public.is_platform_admin());
CREATE POLICY notification_preferences_insert ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (notification_preferences.user_id = public.krewpact_user_id()::uuid OR public.is_platform_admin());
CREATE POLICY notification_preferences_update ON notification_preferences FOR UPDATE TO authenticated
  USING (notification_preferences.user_id = public.krewpact_user_id()::uuid OR public.is_platform_admin());

COMMIT;
