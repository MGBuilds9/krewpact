-- Drop orphaned lead_stage enum type
-- The leads.stage column was already removed. leads.status uses lead_status enum.
-- The lead_stage_history table uses TEXT columns (unaffected).
-- The update_lead_stage_entered_at() trigger fires on leads.status changes (unaffected).

DROP TYPE IF EXISTS lead_stage;
