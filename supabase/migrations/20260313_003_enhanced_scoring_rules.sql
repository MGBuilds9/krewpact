-- Enhanced scoring rules: research-backed fit + engagement signals
-- Leverages expanded Apollo data (seniority, employee count, revenue, founded year)
-- Raises theoretical max from ~155 to ~220+ for better signal differentiation

INSERT INTO scoring_rules (name, category, field_name, operator, value, score_impact, is_active, priority) VALUES

-- FIT: Company size signals (employee count is most reliable in Apollo)
('Employees 51-200 (sweet spot)',      'fit', 'enrichment_data.apollo_search.employees',        'greater_than', '50',       10, true, 6),
('Employees 201-1000',                 'fit', 'enrichment_data.apollo_search.employees',        'greater_than', '200',       8, true, 5),
('Revenue > $5M',                      'fit', 'enrichment_data.apollo_match.annual_revenue',    'greater_than', '5000000',  10, true, 5),
('Established company (10+ yrs)',      'fit', 'enrichment_data.apollo_match.founded_year',      'less_than',    '2016',      5, true, 4),

-- FIT: Decision-maker confidence (seniority mapping from research)
('C-Suite Contact',                    'fit', 'enrichment_data.apollo_match.seniority',         'equals',       'c_suite',  15, true, 6),
('VP-Level Contact',                   'fit', 'enrichment_data.apollo_match.seniority',         'equals',       'vp',       12, true, 6),
('Director-Level Contact',             'fit', 'enrichment_data.apollo_match.seniority',         'equals',       'director',  8, true, 5),
('Owner/Founder',                      'fit', 'enrichment_data.apollo_match.seniority',         'equals',       'owner',    15, true, 6),

-- FIT: Negative scoring (disqualification signals)
('Individual Contributor',             'fit', 'enrichment_data.apollo_match.seniority',         'equals',       'entry',   -10, true, 6),
('Outside Ontario',                    'fit', 'province',                                       'not_equals',   'Ontario',  -5, true, 5),

-- FIT: Apollo search seniority (captured at import time)
('C-Suite at Import',                  'fit', 'enrichment_data.apollo_search.seniority',        'equals',       'c_suite',  10, true, 5),
('VP at Import',                       'fit', 'enrichment_data.apollo_search.seniority',        'equals',       'vp',        8, true, 5),
('Owner at Import',                    'fit', 'enrichment_data.apollo_search.seniority',        'equals',       'owner',    10, true, 5),

-- ENGAGEMENT: Web presence as proxy for engagement potential
('Has News Coverage',                  'engagement', 'enrichment_data.brave.news_snippets',     'exists',       '_',         5, true, 4),
('Tavily AI Found Info',               'engagement', 'enrichment_data.tavily.answer',            'exists',       '_',         5, true, 3),
('Multiple Social Profiles',           'engagement', 'enrichment_data.brave.social_profiles',    'exists',       '_',         3, true, 3),
('Has Technologies Listed',            'engagement', 'enrichment_data.apollo_search.technologies','exists',      '_',         3, true, 3)

ON CONFLICT DO NOTHING;
