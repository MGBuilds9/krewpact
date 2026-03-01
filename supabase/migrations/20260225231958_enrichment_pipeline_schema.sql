-- Migration: Enrichment Pipeline Schema Updates
-- 1. Add enrichment_status to leads (for waterfall pipeline tracking)
-- 2. Add missing columns to contacts (lead_id, full_name, linkedin_url, etc.)
--    Root cause: contacts table was created by 00003_crm_operations (account_id schema)
--    but Apollo pump uses 00003_sales_agi schema (lead_id, full_name, title, etc.)

BEGIN;

-- =========================
-- LEADS: Add enrichment_status
-- =========================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

-- =========================
-- CONTACTS: Add missing columns from Sales AGI schema
-- The original contacts table (crm_operations) only has:
--   account_id, first_name, last_name, email, phone, role_title, is_primary, communication_prefs
-- The Apollo pump needs: lead_id, full_name, title, linkedin_url, is_decision_maker, mobile
-- =========================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_opted_in BOOLEAN DEFAULT TRUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_opted_in BOOLEAN DEFAULT TRUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_channel TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_touches INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role TEXT;

-- Make first_name and last_name nullable (Apollo contacts may only have full_name)
ALTER TABLE contacts ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN last_name DROP NOT NULL;

-- Add index on lead_id for join performance
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);

-- Add anon RLS policy for contacts (matches existing demo mode pattern on leads)
DO $$ BEGIN
  CREATE POLICY contacts_anon_select ON contacts FOR SELECT TO anon USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
