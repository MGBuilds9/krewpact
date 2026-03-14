-- Migration: 20260314_001_align_scoring_rules.sql
--
-- Aligns KrewPact's lead scoring engine with the lead-workstation.html tool.
-- Adds new operators (in_set, contains_any) and 15 scoring rules across
-- fit, intent, and engagement categories to match workstation scoring logic.
--
-- New operators:
--   in_set       : field value (case-insensitive, trimmed) matches ANY pipe-separated value
--   contains_any : field value (case-insensitive) contains ANY pipe-separated substring

INSERT INTO scoring_rules
  (name, category, field_name, operator, value, score_impact, is_active, priority)
VALUES

  -- ============================================================
  -- FIT RULES
  -- ============================================================

  -- GTA / Southern Ontario city match
  (
    'GTA City Match',
    'fit',
    'city',
    'in_set',
    'mississauga|toronto|brampton|hamilton|burlington|oakville|milton|vaughan|markham|richmond hill|scarborough|etobicoke|north york|ajax|pickering|oshawa|whitby|newmarket|aurora|king city|caledon|guelph|kitchener|waterloo|cambridge|london|barrie|st. catharines|niagara falls|welland|thornhill|woodbridge|concord|maple|bolton|georgetown|orangeville|stouffville|uxbridge|peterborough|kingston|brantford|halton hills|fort erie|port colborne|grimsby|lincoln|stoney creek|dundas|ancaster|flamborough|binbrook',
    15,
    true,
    11
  ),

  -- Core industry vertical match
  (
    'Core Industry Match',
    'fit',
    'industry',
    'contains_any',
    'healthcare|health care|medical|hospital|real estate|real estate development|institutional|commercial|construction|general contractor|property management|property development|senior living|long-term care|ltc|pharmaceutical|biotech|education|university|college|government|municipal|dental|retail|hospitality',
    10,
    true,
    11
  ),

  -- Any known industry is set (stacks with core industry match)
  (
    'Any Known Industry',
    'fit',
    'industry',
    'exists',
    '_',
    5,
    true,
    4
  ),

  -- Existing client penalty
  (
    'Existing Client Penalty',
    'fit',
    'enrichment_data.is_existing_client',
    'equals',
    'true',
    -10,
    true,
    3
  ),

  -- ============================================================
  -- INTENT RULES
  -- ============================================================

  -- High-trust source: networking or referral
  (
    'Source: Networking/Referral',
    'intent',
    'source_channel',
    'in_set',
    'networking|referral',
    15,
    true,
    11
  ),

  -- Active outbound: door knocking
  (
    'Source: Door Knocking',
    'intent',
    'source_channel',
    'in_set',
    'door_knocking|door knocking',
    10,
    true,
    10
  ),

  -- Digital / inbound channels
  (
    'Source: Outreach/Inbound',
    'intent',
    'source_channel',
    'in_set',
    'outreach|inbound|website',
    5,
    true,
    9
  ),

  -- Lead described their project
  (
    'Has Project Description',
    'intent',
    'project_description',
    'exists',
    '_',
    5,
    true,
    8
  ),

  -- Lead has an estimated value
  (
    'Has Estimated Value',
    'intent',
    'estimated_value',
    'greater_than',
    '0',
    3,
    true,
    7
  ),

  -- Lead indicated timeline urgency
  (
    'Has Timeline Urgency',
    'intent',
    'timeline_urgency',
    'exists',
    '_',
    2,
    true,
    6
  ),

  -- ============================================================
  -- ENGAGEMENT RULES
  -- ============================================================

  -- Has logged notes or activities
  -- (scoring cron populates enrichment_data.activity_count from activities table)
  (
    'Has Notes/Activities',
    'engagement',
    'enrichment_data.activity_count',
    'greater_than',
    '0',
    5,
    true,
    7
  ),

  -- Has a scheduled follow-up date
  (
    'Has Follow-Up Date',
    'engagement',
    'next_followup_at',
    'exists',
    '_',
    5,
    true,
    7
  ),

  -- Has email on record
  (
    'Has Email',
    'engagement',
    'email',
    'exists',
    '_',
    3,
    true,
    6
  ),

  -- Has phone on record
  (
    'Has Phone',
    'engagement',
    'phone',
    'exists',
    '_',
    2,
    true,
    5
  ),

  -- Confirmed decision maker via enrichment
  (
    'Is Decision Maker',
    'engagement',
    'enrichment_data.is_decision_maker',
    'equals',
    'true',
    5,
    true,
    7
  )

ON CONFLICT DO NOTHING;
