-- Add won_at and won_notes columns to opportunities table
-- Required by /api/crm/opportunities/[id]/won/route.ts
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS won_at DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS won_notes TEXT;
