-- Migration: add_portal_clerk_link
-- Adds clerk_user_id and invited_by to portal_accounts to link Clerk identities

ALTER TABLE portal_accounts
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invited_by TEXT; -- Clerk userId of the internal user who sent the invite

CREATE INDEX IF NOT EXISTS idx_portal_accounts_clerk_user_id ON portal_accounts(clerk_user_id);
