-- KrewPact Portals Migration
-- Purpose: Portal accounts, permissions, messages, view logs
-- Depends on: 00003_crm_operations.sql (projects, project_members, users)

BEGIN;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE portal_actor_type AS ENUM ('client', 'trade_partner');

-- =========================
-- PORTAL ACCOUNTS
-- =========================
CREATE TABLE portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type portal_actor_type NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  email CITEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_accounts_email ON portal_accounts(email);

-- =========================
-- PORTAL PERMISSIONS
-- =========================
CREATE TABLE portal_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  permission_set JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(portal_account_id, project_id)
);

CREATE INDEX idx_portal_permissions_account ON portal_permissions(portal_account_id);

-- =========================
-- PORTAL MESSAGES
-- =========================
CREATE TABLE portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_messages_project ON portal_messages(project_id);

-- =========================
-- PORTAL VIEW LOGS
-- =========================
CREATE TABLE portal_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  portal_account_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  viewed_resource_type TEXT NOT NULL,
  viewed_resource_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_portal_view_logs_project ON portal_view_logs(project_id);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_portal_accounts_updated_at BEFORE UPDATE ON portal_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_portal_permissions_updated_at BEFORE UPDATE ON portal_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_view_logs ENABLE ROW LEVEL SECURITY;

-- Portal accounts: Admin only for management
CREATE POLICY portal_accounts_select ON portal_accounts FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY portal_accounts_insert ON portal_accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY portal_accounts_update ON portal_accounts FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

-- Portal permissions: Admin only
CREATE POLICY portal_permissions_select ON portal_permissions FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY portal_permissions_insert ON portal_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY portal_permissions_update ON portal_permissions FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

-- Portal messages: Project-member scoped
CREATE POLICY portal_messages_select ON portal_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = portal_messages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());
CREATE POLICY portal_messages_insert ON portal_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = portal_messages.project_id AND pm.user_id = public.krewpact_user_id()::uuid) OR public.is_platform_admin());

-- Portal view logs: Admin only
CREATE POLICY portal_view_logs_select ON portal_view_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin());

COMMIT;
