-- KrewPact Multi-Tenant Foundations
-- Purpose: Organizations + org_settings + org_id columns on core tables

BEGIN;

-- =========================
-- ORGANIZATIONS
-- =========================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  locale TEXT NOT NULL DEFAULT 'en-CA',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Default org for existing installs (non-MDM specific)
INSERT INTO organizations (name, slug)
SELECT 'Default Organization', 'default'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'default');

-- Helper to provide default org_id for new rows
CREATE OR REPLACE FUNCTION public.default_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
$$;

-- Org settings (white-label config)
CREATE TABLE IF NOT EXISTS org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

CREATE TRIGGER trg_org_settings_updated_at
  BEFORE UPDATE ON org_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- DIVISIONS
-- =========================
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- Backfill org_id for existing divisions
UPDATE divisions
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE org_id IS NULL;

ALTER TABLE divisions ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE divisions ADD CONSTRAINT divisions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Allow same division codes across orgs
ALTER TABLE divisions DROP CONSTRAINT IF EXISTS divisions_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_divisions_org_code ON divisions(org_id, code);
CREATE INDEX IF NOT EXISTS idx_divisions_org ON divisions(org_id);

-- =========================
-- CORE TABLES: ORG ID
-- =========================
-- CRM
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE activities ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- Estimating
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE estimate_lines ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE estimate_versions ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE project_daily_logs ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- Expenses + Notifications
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- ERP sync
ALTER TABLE erp_sync_map ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE erp_sync_jobs ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE erp_sync_events ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE erp_sync_errors ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- Portals
ALTER TABLE portal_accounts ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE portal_permissions ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE portal_messages ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();
ALTER TABLE portal_view_logs ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT public.default_org_id();

-- =========================
-- BACKFILL ORG ID
-- =========================
-- Division-scoped tables
UPDATE accounts a
SET org_id = d.org_id
FROM divisions d
WHERE a.division_id = d.id AND a.org_id IS NULL;

UPDATE leads l
SET org_id = d.org_id
FROM divisions d
WHERE l.division_id = d.id AND l.org_id IS NULL;

UPDATE opportunities o
SET org_id = COALESCE(
  (SELECT d.org_id FROM divisions d WHERE d.id = o.division_id),
  (SELECT l.org_id FROM leads l WHERE l.id = o.lead_id),
  (SELECT a.org_id FROM accounts a WHERE a.id = o.account_id),
  (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
)
WHERE o.org_id IS NULL;

UPDATE activities act
SET org_id = COALESCE(
  (SELECT o.org_id FROM opportunities o WHERE o.id = act.opportunity_id),
  (SELECT l.org_id FROM leads l WHERE l.id = act.lead_id),
  (SELECT a.org_id FROM accounts a WHERE a.id = act.account_id),
  (SELECT c.org_id FROM contacts c WHERE c.id = act.contact_id),
  (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
)
WHERE act.org_id IS NULL;

UPDATE contacts c
SET org_id = COALESCE(
  (SELECT a.org_id FROM accounts a WHERE a.id = c.account_id),
  (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
)
WHERE c.org_id IS NULL;

UPDATE estimates e
SET org_id = COALESCE(
  (SELECT d.org_id FROM divisions d WHERE d.id = e.division_id),
  (SELECT o.org_id FROM opportunities o WHERE o.id = e.opportunity_id),
  (SELECT a.org_id FROM accounts a WHERE a.id = e.account_id),
  (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
)
WHERE e.org_id IS NULL;

UPDATE estimate_lines el
SET org_id = e.org_id
FROM estimates e
WHERE el.estimate_id = e.id AND el.org_id IS NULL;

UPDATE estimate_versions ev
SET org_id = e.org_id
FROM estimates e
WHERE ev.estimate_id = e.id AND ev.org_id IS NULL;

UPDATE projects p
SET org_id = d.org_id
FROM divisions d
WHERE p.division_id = d.id AND p.org_id IS NULL;

UPDATE project_members pm
SET org_id = p.org_id
FROM projects p
WHERE pm.project_id = p.id AND pm.org_id IS NULL;

UPDATE milestones m
SET org_id = p.org_id
FROM projects p
WHERE m.project_id = p.id AND m.org_id IS NULL;

UPDATE tasks t
SET org_id = p.org_id
FROM projects p
WHERE t.project_id = p.id AND t.org_id IS NULL;

UPDATE task_comments tc
SET org_id = t.org_id
FROM tasks t
WHERE tc.task_id = t.id AND tc.org_id IS NULL;

UPDATE project_daily_logs pdl
SET org_id = p.org_id
FROM projects p
WHERE pdl.project_id = p.id AND pdl.org_id IS NULL;

UPDATE expense_claims ec
SET org_id = COALESCE(
  (SELECT d.org_id FROM divisions d WHERE d.id = ec.division_id),
  (SELECT p.org_id FROM projects p WHERE p.id = ec.project_id),
  (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
)
WHERE ec.org_id IS NULL;

UPDATE portal_permissions pp
SET org_id = p.org_id
FROM projects p
WHERE pp.project_id = p.id AND pp.org_id IS NULL;

UPDATE portal_messages pm
SET org_id = p.org_id
FROM projects p
WHERE pm.project_id = p.id AND pm.org_id IS NULL;

UPDATE portal_view_logs pvl
SET org_id = p.org_id
FROM projects p
WHERE pvl.project_id = p.id AND pvl.org_id IS NULL;

-- Notifications + ERP tables default to primary org if unset
UPDATE notifications n
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE n.org_id IS NULL;

UPDATE notification_preferences np
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE np.org_id IS NULL;

UPDATE erp_sync_map esm
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE esm.org_id IS NULL;

UPDATE erp_sync_jobs esj
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE esj.org_id IS NULL;

UPDATE erp_sync_events ese
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE ese.org_id IS NULL;

UPDATE erp_sync_errors ese
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE ese.org_id IS NULL;

UPDATE portal_accounts pa
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE pa.org_id IS NULL;

-- =========================
-- CONSTRAINTS + INDEXES
-- =========================
ALTER TABLE accounts ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE opportunities ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE activities ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE estimates ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE estimate_lines ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE estimate_versions ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE project_members ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE milestones ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE task_comments ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE project_daily_logs ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE erp_sync_map ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE erp_sync_jobs ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE erp_sync_events ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE erp_sync_errors ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE portal_accounts ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE portal_permissions ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE portal_messages ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE portal_view_logs ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE accounts ADD CONSTRAINT accounts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD CONSTRAINT contacts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE leads ADD CONSTRAINT leads_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activities ADD CONSTRAINT activities_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE estimates ADD CONSTRAINT estimates_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE estimate_lines ADD CONSTRAINT estimate_lines_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE estimate_versions ADD CONSTRAINT estimate_versions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE projects ADD CONSTRAINT projects_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE project_members ADD CONSTRAINT project_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE milestones ADD CONSTRAINT milestones_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE task_comments ADD CONSTRAINT task_comments_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE project_daily_logs ADD CONSTRAINT project_daily_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE expense_claims ADD CONSTRAINT expense_claims_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE erp_sync_map ADD CONSTRAINT erp_sync_map_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE erp_sync_jobs ADD CONSTRAINT erp_sync_jobs_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE erp_sync_events ADD CONSTRAINT erp_sync_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE erp_sync_errors ADD CONSTRAINT erp_sync_errors_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE portal_accounts ADD CONSTRAINT portal_accounts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE portal_permissions ADD CONSTRAINT portal_permissions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE portal_messages ADD CONSTRAINT portal_messages_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE portal_view_logs ADD CONSTRAINT portal_view_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(org_id);
CREATE INDEX IF NOT EXISTS idx_estimates_org ON estimates(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_project_members_org ON project_members(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_portal_accounts_org ON portal_accounts(org_id);

COMMIT;
