-- Phase 1.0: Add org_id to users table for multi-tenancy.
--
-- Required by:
-- - sync-roles.ts: stamps krewpact_org_id into Clerk JWT from user's org
-- - AI table RLS: can resolve org through users table join
-- - withApiRoute: fallback org resolution chain
--
-- Backfills all existing users with the 'default' org (the only org that exists).

-- Add the column (nullable first for backfill)
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

-- Backfill existing users with the default org
UPDATE users
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE org_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE users ALTER COLUMN org_id SET NOT NULL;

-- Index for RLS performance (org_id is used in JWT-based policies)
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
