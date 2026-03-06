-- Seed outreach sequences per vertical
-- Each sequence has 4 steps: cold intro (day 0), case study follow-up (day 3), phone call (day 7), final follow-up (day 14)

-- Note: template_id references are resolved by name at enrollment time via the sequence processor.
-- The step config stores the template name for lookup.

DO $$
DECLARE
  seq_pharmacy_id UUID;
  seq_franchise_id UUID;
  seq_dental_id UUID;
  seq_property_id UUID;
  seq_telecom_id UUID;
  tpl_medical_id UUID;
  tpl_franchise_id UUID;
  tpl_dental_id UUID;
  tpl_property_id UUID;
  tpl_telecom_id UUID;
  tpl_followup_id UUID;
  tpl_final_id UUID;
BEGIN
  -- Look up template IDs
  SELECT id INTO tpl_medical_id FROM email_templates WHERE name = 'medical-cold-intro' LIMIT 1;
  SELECT id INTO tpl_franchise_id FROM email_templates WHERE name = 'franchise-cold-intro' LIMIT 1;
  SELECT id INTO tpl_dental_id FROM email_templates WHERE name = 'dental-cold-intro' LIMIT 1;
  SELECT id INTO tpl_property_id FROM email_templates WHERE name = 'property-mgr-cold-intro' LIMIT 1;
  SELECT id INTO tpl_telecom_id FROM email_templates WHERE name = 'telecom-cold-intro' LIMIT 1;
  SELECT id INTO tpl_followup_id FROM email_templates WHERE name = 'follow-up-case-study' LIMIT 1;
  SELECT id INTO tpl_final_id FROM email_templates WHERE name = 'follow-up-final' LIMIT 1;

  -- Pharmacy Outreach Sequence
  INSERT INTO outreach_sequences (id, name, description, is_active)
  VALUES (gen_random_uuid(), 'Pharmacy Outreach', 'Cold outreach sequence for pharmacy owners and medical facility decision makers', true)
  RETURNING id INTO seq_pharmacy_id;

  INSERT INTO sequence_steps (sequence_id, step_number, delay_days, action_type, template_id, subject_override) VALUES
    (seq_pharmacy_id, 1, 0, 'email', tpl_medical_id, NULL),
    (seq_pharmacy_id, 2, 3, 'email', tpl_followup_id, NULL),
    (seq_pharmacy_id, 3, 7, 'call', NULL, 'Phone call follow-up'),
    (seq_pharmacy_id, 4, 14, 'email', tpl_final_id, NULL);

  -- Franchise Outreach Sequence
  INSERT INTO outreach_sequences (id, name, description, is_active)
  VALUES (gen_random_uuid(), 'Franchise Outreach', 'Cold outreach sequence for franchise operators and restaurant owners', true)
  RETURNING id INTO seq_franchise_id;

  INSERT INTO sequence_steps (sequence_id, step_number, delay_days, action_type, template_id, subject_override) VALUES
    (seq_franchise_id, 1, 0, 'email', tpl_franchise_id, NULL),
    (seq_franchise_id, 2, 3, 'email', tpl_followup_id, NULL),
    (seq_franchise_id, 3, 7, 'call', NULL, 'Phone call follow-up'),
    (seq_franchise_id, 4, 14, 'email', tpl_final_id, NULL);

  -- Dental Outreach Sequence
  INSERT INTO outreach_sequences (id, name, description, is_active)
  VALUES (gen_random_uuid(), 'Dental Clinic Outreach', 'Cold outreach sequence for dental clinic owners and practice managers', true)
  RETURNING id INTO seq_dental_id;

  INSERT INTO sequence_steps (sequence_id, step_number, delay_days, action_type, template_id, subject_override) VALUES
    (seq_dental_id, 1, 0, 'email', tpl_dental_id, NULL),
    (seq_dental_id, 2, 3, 'email', tpl_followup_id, NULL),
    (seq_dental_id, 3, 7, 'call', NULL, 'Phone call follow-up'),
    (seq_dental_id, 4, 14, 'email', tpl_final_id, NULL);

  -- Property Manager Outreach Sequence
  INSERT INTO outreach_sequences (id, name, description, is_active)
  VALUES (gen_random_uuid(), 'Property Manager Outreach', 'Cold outreach sequence for commercial property managers and facilities directors', true)
  RETURNING id INTO seq_property_id;

  INSERT INTO sequence_steps (sequence_id, step_number, delay_days, action_type, template_id, subject_override) VALUES
    (seq_property_id, 1, 0, 'email', tpl_property_id, NULL),
    (seq_property_id, 2, 3, 'email', tpl_followup_id, NULL),
    (seq_property_id, 3, 7, 'call', NULL, 'Phone call follow-up'),
    (seq_property_id, 4, 14, 'email', tpl_final_id, NULL);

  -- Telecom Outreach Sequence
  INSERT INTO outreach_sequences (id, name, description, is_active)
  VALUES (gen_random_uuid(), 'Telecom Network Outreach', 'Cold outreach sequence for telecom network construction managers', true)
  RETURNING id INTO seq_telecom_id;

  INSERT INTO sequence_steps (sequence_id, step_number, delay_days, action_type, template_id, subject_override) VALUES
    (seq_telecom_id, 1, 0, 'email', tpl_telecom_id, NULL),
    (seq_telecom_id, 2, 3, 'email', tpl_followup_id, NULL),
    (seq_telecom_id, 3, 7, 'call', NULL, 'Phone call follow-up'),
    (seq_telecom_id, 4, 14, 'email', tpl_final_id, NULL);
END $$;
