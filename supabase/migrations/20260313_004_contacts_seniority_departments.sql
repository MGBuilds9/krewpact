-- Add seniority and departments columns to contacts table
-- Captured from Apollo search results at import time

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS seniority TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS departments TEXT;
