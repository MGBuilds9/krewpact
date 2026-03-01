-- Seed scoring rules for construction lead scoring
-- Rules evaluate flat lead fields AND nested enrichment_data (dot-notation)
-- Categories: fit (company match), intent (service need), engagement (interaction)

INSERT INTO scoring_rules (name, category, field_name, operator, value, score_impact, is_active, priority) VALUES
-- FIT: Is this company a good match for MDM?
('Industry: Construction',        'fit', 'industry',                                          'contains', 'construction', 15, true, 10),
('Google Rating > 4.0',           'fit', 'enrichment_data.google_maps.google_rating',         'greater_than', '4.0', 10, true, 9),
('Google Reviews > 20',           'fit', 'enrichment_data.google_maps.google_reviews_count',  'greater_than', '20', 5, true, 8),
('Business: Operational',         'fit', 'enrichment_data.google_maps.business_status',       'equals', 'OPERATIONAL', 5, true, 7),
('Province: Ontario',             'fit', 'province',                                          'equals', 'Ontario', 10, true, 6),
('City Known',                    'fit', 'city',                                              'exists', '_', 5, true, 5),

-- INTENT: Are they likely to need MDM services?
('Has Company Website',           'intent', 'enrichment_data.brave.website',                  'exists', '_', 10, true, 10),
('Has Contact Email',             'intent', 'enrichment_data.apollo_match.email',              'exists', '_', 10, true, 9),
('Web Description: Construction', 'intent', 'enrichment_data.brave.description',              'contains', 'construction', 5, true, 8),
('Has Domain',                    'intent', 'domain',                                         'exists', '_', 5, true, 7),

-- ENGAGEMENT: Have they interacted or been contacted?
('Status: Contacted',             'engagement', 'status',                                     'equals', 'contacted', 15, true, 10),
('Status: Qualified',             'engagement', 'status',                                     'equals', 'qualified', 20, true, 9),
('Has LinkedIn Profile',          'engagement', 'enrichment_data.apollo_match.linkedin_url',   'exists', '_', 5, true, 8),
('Status: Proposal',              'engagement', 'status',                                     'equals', 'proposal', 25, true, 7),
('Status: Won',                   'engagement', 'status',                                     'equals', 'won', 30, true, 6)
ON CONFLICT DO NOTHING;
