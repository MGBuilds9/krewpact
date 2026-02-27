-- KrewPact Migration: Duplicate Detection Support
-- Purpose: Add GIN trigram indexes for fuzzy matching on CRM entities

BEGIN;

-- pg_trgm already enabled in sales_agi.sql
-- Add GIN trigram indexes for fuzzy name matching

CREATE INDEX IF NOT EXISTS idx_leads_company_name_trgm
  ON leads USING GIN (company_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_full_name_trgm
  ON contacts USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_accounts_name_trgm
  ON accounts USING GIN (account_name gin_trgm_ops);

COMMIT;
