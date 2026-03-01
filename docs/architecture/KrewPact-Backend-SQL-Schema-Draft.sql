-- KrewPact Production Schema Draft
-- Purpose: Canonical backend schema for KrewPact + ERPNext bridge
-- Target DB: PostgreSQL 15+ (Supabase compatible)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE role_scope AS ENUM ('company', 'division', 'project');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'invited', 'archived');
CREATE TYPE lead_stage AS ENUM ('new', 'qualified', 'estimating', 'proposal_sent', 'won', 'lost');
CREATE TYPE opportunity_stage AS ENUM ('intake', 'site_visit', 'estimating', 'proposal', 'negotiation', 'contracted', 'closed_lost');
CREATE TYPE estimate_status AS ENUM ('draft', 'review', 'sent', 'approved', 'rejected', 'superseded');
CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'superseded');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_signature', 'signed', 'amended', 'terminated');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'substantial_complete', 'closed', 'cancelled');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
CREATE TYPE workflow_state AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'void');
CREATE TYPE co_status AS ENUM ('draft', 'submitted', 'client_review', 'approved', 'rejected', 'void');
CREATE TYPE rfi_status AS ENUM ('open', 'responded', 'closed', 'void');
CREATE TYPE submittal_status AS ENUM ('draft', 'submitted', 'revise_and_resubmit', 'approved', 'approved_as_noted', 'rejected');
CREATE TYPE file_visibility AS ENUM ('private', 'internal', 'client_portal', 'trade_portal', 'public_link');
CREATE TYPE sync_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE sync_status AS ENUM ('queued', 'processing', 'succeeded', 'failed', 'dead_letter');
CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'posted');
CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'exported');
CREATE TYPE invoice_snapshot_status AS ENUM ('draft', 'issued', 'sent', 'partially_paid', 'paid', 'void', 'overdue');
CREATE TYPE po_snapshot_status AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'received', 'closed', 'void');
CREATE TYPE portal_actor_type AS ENUM ('client', 'trade');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push', 'sms');
CREATE TYPE notification_state AS ENUM ('queued', 'sent', 'delivered', 'failed', 'read');

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

CREATE OR REPLACE FUNCTION ensure_positive_amount(v NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
  IF v < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;
  RETURN v;
END;
$$;

-- =========================
-- ORG + SECURITY
-- =========================
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

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

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

CREATE TABLE policy_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id UUID,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- CRM
-- =========================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'client',
  billing_address JSONB,
  shipping_address JSONB,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email CITEXT,
  phone TEXT,
  role_title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  communication_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  source TEXT,
  lead_name TEXT NOT NULL,
  company_name TEXT,
  email CITEXT,
  phone TEXT,
  stage lead_stage NOT NULL DEFAULT 'new',
  estimated_value NUMERIC(14,2) DEFAULT 0,
  probability_pct NUMERIC(5,2) DEFAULT 0,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  lost_reason TEXT,
  -- Sales AGI scoring fields (from LeadForge merge)
  fit_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  enrichment_data JSONB DEFAULT '{}',
  enrichment_status TEXT DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  opportunity_name TEXT NOT NULL,
  stage opportunity_stage NOT NULL DEFAULT 'intake',
  target_close_date DATE,
  estimated_revenue NUMERIC(14,2) DEFAULT 0,
  probability_pct NUMERIC(5,2) DEFAULT 0,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE opportunity_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  from_stage opportunity_stage,
  to_stage opportunity_stage NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- SALES AUTOMATION (merged from LeadForge)
-- =========================

-- Lead scoring engine — configurable rules per division
CREATE TABLE lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  score_type TEXT NOT NULL, -- 'fit', 'intent', 'engagement'
  conditions JSONB NOT NULL,
  score_value INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Score history for analytics and trend tracking
CREATE TABLE lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  fit_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outreach automation sequences
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  sequence_name TEXT NOT NULL,
  description TEXT,
  trigger_conditions JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- 'email', 'wait', 'condition', 'task', 'webhook'
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'bounced', 'replied'
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email templates with merge fields
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  merge_fields JSONB DEFAULT '[]',
  category TEXT, -- 'outreach', 'follow_up', 'nurture', 'notification'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outreach event tracking (emails, calls, LinkedIn, SMS)
CREATE TABLE outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
  channel TEXT NOT NULL, -- 'email', 'call', 'linkedin', 'sms'
  direction TEXT NOT NULL, -- 'outbound', 'inbound'
  subject TEXT,
  content TEXT,
  status TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'
  external_id TEXT, -- Instantly.ai campaign ID, etc.
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data enrichment pipeline tracking
CREATE TABLE enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'apollo', 'clearbit', 'linkedin', 'google'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  request_payload JSONB,
  response_payload JSONB,
  enriched_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Construction-specific bidding opportunity tracking
CREATE TABLE bidding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  source_platform TEXT NOT NULL, -- 'bids_and_tenders', 'merx', 'manual'
  external_id TEXT,
  project_title TEXT NOT NULL,
  owner_name TEXT,
  location TEXT,
  estimated_value NUMERIC(14,2),
  bid_deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'new',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- ESTIMATING
-- =========================
CREATE TABLE cost_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  item_code TEXT,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  base_cost NUMERIC(14,4) NOT NULL,
  vendor_name TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  assembly_code TEXT,
  assembly_name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assembly_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES cost_catalog_items(id) ON DELETE SET NULL,
  line_type TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  project_type TEXT,
  payload JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  estimate_number TEXT UNIQUE NOT NULL,
  status estimate_status NOT NULL DEFAULT 'draft',
  currency_code CHAR(3) NOT NULL DEFAULT 'CAD',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(5,2),
  revision_no INTEGER NOT NULL DEFAULT 1,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimate_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  parent_line_id UUID REFERENCES estimate_lines(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL,
  assembly_id UUID REFERENCES assemblies(id) ON DELETE SET NULL,
  catalog_item_id UUID REFERENCES cost_catalog_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  markup_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimate_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(estimate_id, revision_no)
);

CREATE TABLE estimate_alternates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimate_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  allowance_name TEXT NOT NULL,
  allowance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- CONTRACTING + ESIGN
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

CREATE TABLE proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

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

CREATE TABLE esign_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES esign_envelopes(id) ON DELETE CASCADE,
  file_id UUID,
  certificate_file_id UUID,
  checksum_sha256 TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- PROJECT EXECUTION
-- =========================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contract_terms(id) ON DELETE SET NULL,
  project_number TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'planning',
  site_address JSONB,
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  baseline_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  baseline_schedule JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL,
  allocation_pct NUMERIC(5,2),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id, joined_at)
);

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  milestone_order INTEGER NOT NULL DEFAULT 0,
  planned_date DATE,
  actual_date DATE,
  status workflow_state NOT NULL DEFAULT 'draft',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  blocked_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  weather JSONB,
  crew_count INTEGER,
  work_summary TEXT,
  delays TEXT,
  safety_notes TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  is_offline_origin BOOLEAN NOT NULL DEFAULT FALSE,
  sync_client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, log_date, submitted_by)
);

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

-- =========================
-- RFI / SUBMITTAL / CHANGE ORDER
-- =========================
CREATE TABLE rfi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfi_number TEXT NOT NULL,
  title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  status rfi_status NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responder_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, rfi_number)
);

CREATE TABLE rfi_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfi_items(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  is_official_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submittal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status submittal_status NOT NULL DEFAULT 'draft',
  due_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, submittal_number)
);

CREATE TABLE submittal_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  outcome submittal_status NOT NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state workflow_state NOT NULL DEFAULT 'draft',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  estimated_cost_impact NUMERIC(14,2) NOT NULL DEFAULT 0,
  estimated_days_impact INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, request_number)
);

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
  co_number TEXT NOT NULL,
  status co_status NOT NULL DEFAULT 'draft',
  reason TEXT,
  amount_delta NUMERIC(14,2) NOT NULL DEFAULT 0,
  days_delta INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  signed_contract_id UUID REFERENCES contract_terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, co_number)
);

-- =========================
-- FILES + PHOTOS
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

CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  linked_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, file_id)
);

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

CREATE TABLE photo_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photo_assets(id) ON DELETE CASCADE,
  annotation_json JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- SAFETY
-- =========================
CREATE TABLE safety_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  form_date DATE NOT NULL,
  state workflow_state NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  incident_date TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  corrective_actions JSONB,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  talk_date DATE NOT NULL,
  topic TEXT NOT NULL,
  facilitator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  attendee_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  state workflow_state NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  inspector_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- TIME + EXPENSE
-- =========================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_regular NUMERIC(6,2) NOT NULL DEFAULT 0,
  hours_overtime NUMERIC(6,2) NOT NULL DEFAULT 0,
  cost_code TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE timesheet_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status timesheet_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  exported_at TIMESTAMPTZ,
  adp_export_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(period_end >= period_start)
);

CREATE TABLE expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'CAD',
  status expense_status NOT NULL DEFAULT 'draft',
  erp_document_type TEXT,
  erp_document_id TEXT,
  submitted_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(amount >= 0),
  CHECK(tax_amount >= 0)
);

CREATE TABLE expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  ocr_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- ERP BRIDGE
-- =========================
CREATE TABLE erp_sync_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  local_id UUID,
  local_key TEXT,
  erp_doctype TEXT NOT NULL,
  erp_docname TEXT NOT NULL,
  direction sync_direction NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, local_id, erp_doctype)
);

CREATE TABLE erp_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  sync_direction sync_direction NOT NULL,
  status sync_status NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE erp_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES erp_sync_jobs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE erp_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES erp_sync_jobs(id) ON DELETE CASCADE,
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  invoice_date DATE,
  due_date DATE,
  status invoice_snapshot_status NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_link_url TEXT,
  erp_docname TEXT,
  snapshot_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invoice_number)
);

CREATE TABLE po_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  supplier_name TEXT,
  po_date DATE,
  status po_snapshot_status NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  erp_docname TEXT,
  snapshot_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(po_number)
);

CREATE TABLE job_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  baseline_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  revised_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  committed_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  forecast_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  forecast_margin_pct NUMERIC(6,3),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, snapshot_date)
);

-- =========================
-- PORTALS
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

CREATE TABLE portal_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  permission_set JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(portal_account_id, project_id)
);

CREATE TABLE portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- =========================
-- NOTIFICATIONS + AUDIT + IDEMPOTENCY
-- =========================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES portal_accounts(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  state notification_state NOT NULL DEFAULT 'queued',
  title TEXT NOT NULL,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_portal_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
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
-- PROCUREMENT + COMPLIANCE + SELECTIONS + CLOSEOUT
-- =========================
CREATE TABLE cost_code_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  cost_code TEXT NOT NULL,
  cost_code_name TEXT NOT NULL,
  parent_cost_code_id UUID REFERENCES cost_code_dictionary(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(division_id, cost_code)
);

CREATE TABLE cost_code_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  local_cost_code TEXT NOT NULL,
  erp_cost_code TEXT NOT NULL,
  adp_labor_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(division_id, local_cost_code)
);

CREATE TABLE rfq_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  scope_summary TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','closed','awarded','cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, rfq_number)
);

CREATE TABLE rfq_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_packages(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES portal_accounts(id) ON DELETE CASCADE,
  invited_email CITEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','opened','declined','submitted')),
  UNIQUE(rfq_id, portal_account_id, invited_email)
);

CREATE TABLE rfq_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_packages(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES rfq_invites(id) ON DELETE SET NULL,
  submitted_by_portal_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  currency_code CHAR(3) NOT NULL DEFAULT 'CAD',
  subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  exclusions TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','awarded','rejected','withdrawn')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

CREATE TABLE bid_leveling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_packages(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rfq_id, version_no)
);

CREATE TABLE bid_leveling_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leveling_session_id UUID NOT NULL REFERENCES bid_leveling_sessions(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES rfq_bids(id) ON DELETE CASCADE,
  normalized_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  risk_score NUMERIC(6,3),
  recommended BOOLEAN NOT NULL DEFAULT FALSE,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trade_partner_compliance_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  compliance_type TEXT NOT NULL,
  file_id UUID REFERENCES file_metadata(id) ON DELETE SET NULL,
  doc_number TEXT,
  issued_on DATE,
  expires_on DATE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring','expired','rejected')),
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE selection_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','client_review','approved','locked')),
  issued_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE selection_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_sheet_id UUID NOT NULL REFERENCES selection_sheets(id) ON DELETE CASCADE,
  option_group TEXT NOT NULL,
  option_name TEXT NOT NULL,
  allowance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  upgrade_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(allowance_amount >= 0 AND upgrade_amount >= 0)
);

CREATE TABLE selection_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_sheet_id UUID NOT NULL REFERENCES selection_sheets(id) ON DELETE CASCADE,
  selection_option_id UUID NOT NULL REFERENCES selection_options(id) ON DELETE CASCADE,
  chosen_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  chosen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE TABLE allowance_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  allowance_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  selected_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE closeout_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','client_review','accepted','rejected')),
  checklist_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deficiency_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  closeout_package_id UUID REFERENCES closeout_packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','verified','closed')),
  severity TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warranty_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES deficiency_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  provider_name TEXT,
  warranty_start DATE NOT NULL,
  warranty_end DATE NOT NULL,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(warranty_end >= warranty_start)
);

CREATE TABLE service_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  warranty_item_id UUID REFERENCES warranty_items(id) ON DELETE SET NULL,
  call_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','scheduled','in_progress','resolved','closed','cancelled')),
  requested_by_portal_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, call_number)
);

CREATE TABLE service_call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_portal_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE privacy_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privacy_request_id UUID NOT NULL REFERENCES privacy_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE bcp_recovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES bcp_incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feature_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  portal_account_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adoption_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  dimension JSONB NOT NULL DEFAULT '{}'::jsonb,
  metric_value NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, metric_name, dimension)
);

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

-- =========================
-- RAG / KNOWLEDGE LAYER (pgvector)
-- =========================

-- Vectorized knowledge store (Book content + project data + SOPs)
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- 'book_chapter', 'sop', 'project_lesson', 'market_data', 'competitor_intel'
  source_path TEXT NOT NULL, -- file path or entity reference
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 or similar
  metadata JSONB DEFAULT '{}',
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embedding ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AI chat sessions for RAG queries
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT, -- 'general', 'project', 'lead', 'estimate'
  context_id UUID, -- project_id, lead_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  sources JSONB, -- references to knowledge_embeddings used
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- UNIFIED EVENT BUS
-- =========================

-- Cross-system event bus (enables all integration flows)
CREATE TABLE unified_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_system TEXT NOT NULL, -- 'krewpact', 'leadforge', 'website', 'book', 'erpnext'
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL,
  processed_by JSONB DEFAULT '[]', -- array of systems that have consumed this event
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unified_events_type_time ON unified_events(event_type, created_at DESC);
CREATE INDEX idx_unified_events_unprocessed ON unified_events(source_system, created_at)
  WHERE NOT (processed_by ? 'all');

-- =========================
-- MIGRATION
-- =========================
CREATE TABLE migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  batch_name TEXT NOT NULL,
  status sync_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  summary JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE migration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID,
  status sync_status NOT NULL DEFAULT 'queued',
  source_payload JSONB,
  transform_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, source_type, source_key)
);

CREATE TABLE migration_conflicts (
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

CREATE TABLE migration_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES migration_records(id) ON DELETE CASCADE,
  source_file_path TEXT NOT NULL,
  target_file_id UUID REFERENCES file_metadata(id) ON DELETE SET NULL,
  status sync_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_divisions_user ON user_divisions(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_projects_division_status ON projects(division_id, status);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_daily_logs_project_date ON project_daily_logs(project_id, log_date DESC);
CREATE INDEX idx_rfi_project_status ON rfi_items(project_id, status);
CREATE INDEX idx_submittal_project_status ON submittals(project_id, status);
CREATE INDEX idx_change_orders_project_status ON change_orders(project_id, status);
CREATE INDEX idx_file_metadata_project ON file_metadata(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_file_metadata_tags ON file_metadata USING GIN(tags);
CREATE INDEX idx_rfq_packages_project_status ON rfq_packages(project_id, status);
CREATE INDEX idx_rfq_bids_rfq_status ON rfq_bids(rfq_id, status);
CREATE INDEX idx_trade_compliance_status_expiry ON trade_partner_compliance_docs(status, expires_on);
CREATE INDEX idx_selection_sheets_project_status ON selection_sheets(project_id, status);
CREATE INDEX idx_allowance_recon_project ON allowance_reconciliations(project_id);
CREATE INDEX idx_service_calls_project_status ON service_calls(project_id, status);
CREATE INDEX idx_warranty_items_project_end ON warranty_items(project_id, warranty_end);
CREATE INDEX idx_privacy_requests_status_due ON privacy_requests(status, due_at);
CREATE INDEX idx_bcp_incidents_status_severity ON bcp_incidents(status, severity);
CREATE INDEX idx_feature_usage_name_time ON feature_usage_events(event_name, occurred_at DESC);
CREATE INDEX idx_expense_claims_user_status ON expense_claims(user_id, status);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, work_date DESC);
CREATE INDEX idx_erp_sync_jobs_status_sched ON erp_sync_jobs(status, scheduled_at);
CREATE INDEX idx_invoice_snapshots_project_status ON invoice_snapshots(project_id, status);
CREATE INDEX idx_notifications_user_state ON notifications(user_id, state);
CREATE INDEX idx_audit_logs_entity_time ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_webhook_events_provider_status ON webhook_events(provider, processing_status, received_at DESC);
CREATE INDEX idx_migration_records_batch_status ON migration_records(batch_id, status);

-- Sales Automation indexes
CREATE INDEX idx_lead_scoring_rules_division ON lead_scoring_rules(division_id) WHERE is_active = TRUE;
CREATE INDEX idx_lead_score_history_lead ON lead_score_history(lead_id, scored_at DESC);
CREATE INDEX idx_leads_total_score ON leads(total_score DESC) WHERE stage NOT IN ('won', 'lost');
CREATE INDEX idx_outreach_sequences_division ON outreach_sequences(division_id) WHERE is_active = TRUE;
CREATE INDEX idx_sequence_enrollments_status ON sequence_enrollments(status, sequence_id);
CREATE INDEX idx_outreach_events_lead ON outreach_events(lead_id, sent_at DESC);
CREATE INDEX idx_outreach_events_contact ON outreach_events(contact_id, sent_at DESC);
CREATE INDEX idx_enrichment_jobs_status ON enrichment_jobs(status, created_at);
CREATE INDEX idx_bidding_opportunities_deadline ON bidding_opportunities(bid_deadline, status);
CREATE INDEX idx_bidding_opportunities_division ON bidding_opportunities(division_id, status);

-- RAG / Knowledge indexes
CREATE INDEX idx_knowledge_embeddings_source ON knowledge_embeddings(source_type, division_id);
CREATE INDEX idx_ai_chat_sessions_user ON ai_chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at);

-- =========================
-- TRIGGERS
-- =========================
CREATE TRIGGER trg_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_catalog_updated_at BEFORE UPDATE ON cost_catalog_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assemblies_updated_at BEFORE UPDATE ON assemblies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assembly_items_updated_at BEFORE UPDATE ON assembly_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON estimate_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_estimate_lines_updated_at BEFORE UPDATE ON estimate_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contract_terms_updated_at BEFORE UPDATE ON contract_terms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_esign_env_updated_at BEFORE UPDATE ON esign_envelopes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_daily_logs_updated_at BEFORE UPDATE ON project_daily_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_diary_updated_at BEFORE UPDATE ON site_diary_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rfi_updated_at BEFORE UPDATE ON rfi_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_submittals_updated_at BEFORE UPDATE ON submittals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_change_req_updated_at BEFORE UPDATE ON change_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_change_orders_updated_at BEFORE UPDATE ON change_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON file_folders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_files_updated_at BEFORE UPDATE ON file_metadata FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cost_codes_updated_at BEFORE UPDATE ON cost_code_dictionary FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cost_code_map_updated_at BEFORE UPDATE ON cost_code_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rfq_packages_updated_at BEFORE UPDATE ON rfq_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rfq_bids_updated_at BEFORE UPDATE ON rfq_bids FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_level_entries_updated_at BEFORE UPDATE ON bid_leveling_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_trade_compliance_updated_at BEFORE UPDATE ON trade_partner_compliance_docs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_selection_sheets_updated_at BEFORE UPDATE ON selection_sheets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_selection_options_updated_at BEFORE UPDATE ON selection_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_allowance_recon_updated_at BEFORE UPDATE ON allowance_reconciliations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_closeout_packages_updated_at BEFORE UPDATE ON closeout_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_deficiency_items_updated_at BEFORE UPDATE ON deficiency_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_warranty_items_updated_at BEFORE UPDATE ON warranty_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_calls_updated_at BEFORE UPDATE ON service_calls FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_safety_forms_updated_at BEFORE UPDATE ON safety_forms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_safety_incidents_updated_at BEFORE UPDATE ON safety_incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_toolbox_updated_at BEFORE UPDATE ON toolbox_talks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timesheet_updated_at BEFORE UPDATE ON timesheet_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_expense_claims_updated_at BEFORE UPDATE ON expense_claims FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sync_map_updated_at BEFORE UPDATE ON erp_sync_map FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sync_jobs_updated_at BEFORE UPDATE ON erp_sync_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inv_snap_updated_at BEFORE UPDATE ON invoice_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_po_snap_updated_at BEFORE UPDATE ON po_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_portal_accounts_updated_at BEFORE UPDATE ON portal_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_portal_perms_updated_at BEFORE UPDATE ON portal_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_privacy_requests_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bcp_incidents_updated_at BEFORE UPDATE ON bcp_incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reference_sets_updated_at BEFORE UPDATE ON reference_data_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reference_values_updated_at BEFORE UPDATE ON reference_data_values FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_migration_batches_updated_at BEFORE UPDATE ON migration_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_migration_records_updated_at BEFORE UPDATE ON migration_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_migration_attachments_updated_at BEFORE UPDATE ON migration_attachments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sales Automation triggers
CREATE TRIGGER trg_lead_scoring_rules_updated_at BEFORE UPDATE ON lead_scoring_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_outreach_sequences_updated_at BEFORE UPDATE ON outreach_sequences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sequence_steps_updated_at BEFORE UPDATE ON sequence_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sequence_enrollments_updated_at BEFORE UPDATE ON sequence_enrollments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bidding_opportunities_updated_at BEFORE UPDATE ON bidding_opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RAG / Knowledge triggers
CREATE TRIGGER trg_knowledge_embeddings_updated_at BEFORE UPDATE ON knowledge_embeddings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- WORKFLOW HELPERS
-- =========================
CREATE OR REPLACE FUNCTION can_transition_workflow(current_state workflow_state, target_state workflow_state)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_state = target_state THEN
    RETURN TRUE;
  END IF;

  IF current_state = 'draft' AND target_state IN ('submitted', 'void') THEN RETURN TRUE; END IF;
  IF current_state = 'submitted' AND target_state IN ('in_review', 'rejected', 'void') THEN RETURN TRUE; END IF;
  IF current_state = 'in_review' AND target_state IN ('approved', 'rejected', 'void') THEN RETURN TRUE; END IF;
  IF current_state = 'rejected' AND target_state IN ('draft', 'void') THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION queue_erp_sync(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_direction sync_direction,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO erp_sync_jobs(entity_type, entity_id, sync_direction, payload)
  VALUES (p_entity_type, p_entity_id, p_direction, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_sync_job_failure(
  p_job_id UUID,
  p_error_code TEXT,
  p_error_message TEXT,
  p_error_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  UPDATE erp_sync_jobs
  SET status = 'failed',
      attempt_count = attempt_count + 1,
      last_error = p_error_message,
      updated_at = NOW()
  WHERE id = p_job_id;

  SELECT attempt_count, max_attempts INTO v_attempts, v_max_attempts
  FROM erp_sync_jobs WHERE id = p_job_id;

  INSERT INTO erp_sync_errors(job_id, error_code, error_message, error_payload)
  VALUES (p_job_id, p_error_code, p_error_message, COALESCE(p_error_payload, '{}'::jsonb));

  IF v_attempts >= v_max_attempts THEN
    UPDATE erp_sync_jobs SET status = 'dead_letter', updated_at = NOW() WHERE id = p_job_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION apply_change_order_budget_impact(p_change_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id UUID;
  v_amount_delta NUMERIC(14,2);
BEGIN
  SELECT project_id, amount_delta INTO v_project_id, v_amount_delta
  FROM change_orders
  WHERE id = p_change_order_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid change order id %', p_change_order_id;
  END IF;

  UPDATE projects
  SET current_budget = current_budget + COALESCE(v_amount_delta, 0),
      updated_at = NOW()
  WHERE id = v_project_id;
END;
$$;

-- =========================
-- RLS PLACEHOLDER NOTES
-- =========================
-- 1) Enable RLS on all user-facing tables in implementation migration.
-- 2) Use helper functions mapping JWT -> users.id and division/project scopes.
-- 3) Deny-by-default; add explicit SELECT/INSERT/UPDATE/DELETE policies per role.
-- 4) Keep service-role bypass scoped to integration workers only.

COMMIT;
