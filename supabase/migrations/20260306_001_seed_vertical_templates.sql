-- Seed vertical-specific email templates for lead generation outreach
-- Each template targets a specific vertical with relevant messaging

INSERT INTO email_templates (id, name, subject, body_html, body_text, category, is_active, variables)
VALUES
  (
    gen_random_uuid(),
    'medical-cold-intro',
    'Construction Partner for {{company_name}}',
    '<p>Hi {{first_name}},</p><p>I noticed {{company_name}} is in the healthcare space in Ontario. Our team specializes in pharmacy and medical facility construction — from new builds to renovations that meet healthcare compliance standards.</p><p>We''ve completed projects for independent pharmacies and medical clinics across the GTA, handling everything from permits to final inspection.</p><p>Would you be open to a quick call to discuss any upcoming renovation or expansion plans?</p><p>Best regards,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, I noticed {{company_name}} is in the healthcare space in Ontario. Our team specializes in pharmacy and medical facility construction. Would you be open to a quick call? Best regards, {{division_name}} Team, {{division_name}}',
    'outreach',
    true,
    '["first_name", "company_name", "division_name"]'
  ),
  (
    gen_random_uuid(),
    'franchise-cold-intro',
    'Construction Services for {{company_name}} Locations',
    '<p>Hi {{first_name}},</p><p>Managing construction across multiple franchise locations is complex — permits, timelines, brand standards. Our team has experience building and renovating restaurant and retail franchise locations across Ontario.</p><p>We handle multi-site rollouts with consistent quality and on-time delivery, so you can focus on operations.</p><p>Would it make sense to connect about any upcoming builds or refreshes?</p><p>Best regards,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, Managing construction across franchise locations is complex. Our team has experience with restaurant and retail franchise builds across Ontario. Would it make sense to connect? Best regards, {{division_name}} Team, {{division_name}}',
    'outreach',
    true,
    '["first_name", "company_name", "division_name"]'
  ),
  (
    gen_random_uuid(),
    'dental-cold-intro',
    'Building Better Dental Spaces — {{company_name}}',
    '<p>Hi {{first_name}},</p><p>Dental clinic construction has unique requirements — plumbing for operatories, specialized HVAC, infection control compliance. Our team understands these needs and has built dental practices across the GTA.</p><p>Whether you''re expanding, relocating, or refreshing your space, we can help you create a clinic that works for both your team and patients.</p><p>Open to a brief conversation?</p><p>Best regards,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, Dental clinic construction has unique requirements. Our team has built dental practices across the GTA. Open to a brief conversation? Best regards, {{division_name}} Team, {{division_name}}',
    'outreach',
    true,
    '["first_name", "company_name", "division_name"]'
  ),
  (
    gen_random_uuid(),
    'property-mgr-cold-intro',
    'Trusted Construction Partner — {{company_name}}',
    '<p>Hi {{first_name}},</p><p>Managing commercial properties means juggling tenant improvements, common area upgrades, and building maintenance. Our team provides reliable general contracting services for property managers across the GTA.</p><p>We''re known for clean job sites, clear communication, and delivering on schedule — qualities that matter when tenants are involved.</p><p>Would you be interested in adding Our team to your approved contractor list?</p><p>Best regards,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, Our team provides reliable contracting for property managers across the GTA. Would you be interested in adding us to your approved contractor list? Best regards, {{division_name}} Team, {{division_name}}',
    'outreach',
    true,
    '["first_name", "company_name", "division_name"]'
  ),
  (
    gen_random_uuid(),
    'telecom-cold-intro',
    'Telecom Infrastructure Construction — {{company_name}}',
    '<p>Hi {{first_name}},</p><p>Our telecom division specializes in network infrastructure construction across Ontario — cell tower builds, fibre optic installation, and site preparation.</p><p>We have certified crews and the equipment to handle projects from site acquisition through final commissioning.</p><p>I''d like to explore how Our telecom division could support {{company_name}}''s infrastructure projects. Would a 15-minute call work?</p><p>Best regards,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, Our telecom division specializes in network infrastructure construction across Ontario. Would a 15-minute call work to explore how we could support {{company_name}}? Best regards, {{division_name}} Team, {{division_name}}',
    'outreach',
    true,
    '["first_name", "company_name", "division_name"]'
  ),
  (
    gen_random_uuid(),
    'follow-up-case-study',
    'How We Helped a Similar Business — {{company_name}}',
    '<p>Hi {{first_name}},</p><p>I wanted to follow up on my earlier message. I thought you might find this relevant — we recently completed a project similar to what {{company_name}} might need.</p><p>{{case_study_link}}</p><p>The project was completed on time and within budget. Happy to walk you through the details if you''re interested.</p><p>Best regards,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, I wanted to follow up with a relevant case study for {{company_name}}: {{case_study_link}}. Happy to walk you through the details. Best regards, {{division_name}} Team, {{division_name}}',
    'follow_up',
    true,
    '["first_name", "company_name", "division_name", "case_study_link"]'
  ),
  (
    gen_random_uuid(),
    'follow-up-final',
    'Last Note — {{company_name}}',
    '<p>Hi {{first_name}},</p><p>I don''t want to be a bother, so this will be my last reach-out for now. If {{company_name}} ever needs a construction partner in Ontario, Our team would be glad to help.</p><p>Feel free to save my contact for when the timing is right.</p><p>All the best,<br/>{{division_name}} Team<br/>{{division_name}}</p>',
    'Hi {{first_name}}, This will be my last reach-out for now. If {{company_name}} ever needs a construction partner, Our team would be glad to help. All the best, {{division_name}} Team, {{division_name}}',
    'follow_up',
    true,
    '["first_name", "company_name", "division_name"]'
  );
