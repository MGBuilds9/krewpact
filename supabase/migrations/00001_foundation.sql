-- KrewPact Foundation Migration
-- Purpose: Core tables for MVP Phase 0 — users, roles, divisions, audit
-- Extracted from KrewPact-Backend-SQL-Schema-Draft.sql

BEGIN;

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- ENUMS (Foundation subset)
-- =========================
CREATE TYPE role_scope AS ENUM ('company', 'division', 'project');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'invited', 'archived');
CREATE TYPE workflow_state AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'void');
CREATE TYPE sync_status AS ENUM ('queued', 'processing', 'succeeded', 'failed', 'dead_letter');
CREATE TYPE sync_direction AS ENUM ('outbound', 'inbound');

-- =========================
-- SHARED FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =========================
-- FOUNDATION TABLES
-- =========================

-- Divisions (MDM Group structure)
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical MDM Group divisions (seed data)
INSERT INTO divisions (code, name, description) VALUES
  ('contracting', 'MDM Contracting', 'General contracting division'),
  ('homes', 'MDM Homes', 'Residential construction division'),
  ('wood', 'MDM Wood', 'Wood/lumber division'),
  ('telecom', 'MDM Telecom', 'Telecommunications division'),
  ('group-inc', 'MDM Group Inc.', 'Parent company / corporate'),
  ('management', 'MDM Management', 'Property management division');

-- Users (linked to Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE,
  email CITEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status user_status NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  locale TEXT NOT NULL DEFAULT 'en-CA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles (canonical role model)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,
  role_name TEXT NOT NULL,
  scope role_scope NOT NULL DEFAULT 'company',
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical roles (PRD is source of truth — 9 internal + 4 external)
INSERT INTO roles (role_key, role_name, scope) VALUES
  ('platform_admin', 'Platform Admin', 'company'),
  ('executive', 'Executive', 'company'),
  ('operations_manager', 'Operations Manager', 'division'),
  ('project_manager', 'Project Manager', 'project'),
  ('project_coordinator', 'Project Coordinator', 'project'),
  ('estimator', 'Estimator', 'division'),
  ('field_supervisor', 'Field Supervisor', 'project'),
  ('accounting', 'Accounting', 'company'),
  ('payroll_admin', 'Payroll Admin', 'company'),
  ('client_owner', 'Client Owner', 'project'),
  ('client_delegate', 'Client Delegate', 'project'),
  ('trade_partner_admin', 'Trade Partner Admin', 'project'),
  ('trade_partner_user', 'Trade Partner User', 'project');

-- User role assignments
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  project_id UUID,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id, COALESCE(division_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE UNIQUE INDEX user_roles_one_primary_per_user ON user_roles(user_id) WHERE is_primary = TRUE;

-- User division memberships
CREATE TABLE user_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(user_id, division_id)
);

CREATE UNIQUE INDEX user_divisions_one_primary_per_user ON user_divisions(user_id) WHERE is_primary = TRUE AND left_at IS NULL;

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_portal_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  context JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_divisions_user ON user_divisions(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_audit_logs_entity_time ON audit_logs(entity_type, entity_id, created_at DESC);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
