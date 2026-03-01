-- Migration: add_portal_messages_fields
-- Adds direction (inbound/outbound), read_at, and updated_at to portal_messages

ALTER TABLE portal_messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_portal_messages_portal_account_id ON portal_messages(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_project_id ON portal_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_read_at ON portal_messages(read_at) WHERE read_at IS NULL;
