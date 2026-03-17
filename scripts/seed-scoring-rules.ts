/**
 * Seed default lead scoring rules for MDM Group.
 *
 * Idempotent — uses ON CONFLICT DO NOTHING keyed on (name, category).
 * Safe to re-run; existing rules are never overwritten.
 *
 * Score caps enforced by the scoring engine:
 *   fit: 40  |  intent: 35  |  engagement: 25  |  total: 100
 *
 * Usage: npx tsx scripts/seed-scoring-rules.ts
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ScoringRule {
  name: string;
  category: 'fit' | 'intent' | 'engagement';
  field_name: string;
  operator: string;
  value: string;
  score_impact: number;
  is_active: boolean;
  priority: number;
}

const SCORING_RULES: ScoringRule[] = [
  // ── FIT RULES (cap: 40) ────────────────────────────────────────────────────

  {
    name: 'GTA City Match',
    category: 'fit',
    field_name: 'city',
    operator: 'in_set',
    value:
      'mississauga|toronto|brampton|hamilton|burlington|oakville|milton|vaughan|markham|richmond hill|scarborough|etobicoke|north york|ajax|pickering|oshawa|whitby|newmarket|aurora|king city|caledon|guelph|kitchener|waterloo|cambridge|london|barrie|st. catharines|niagara falls|welland|thornhill|woodbridge|concord|maple|bolton|georgetown|orangeville|stouffville|uxbridge|peterborough|kingston|brantford|halton hills|fort erie|port colborne|grimsby|lincoln|stoney creek|dundas|ancaster|flamborough|binbrook',
    score_impact: 15,
    is_active: true,
    priority: 11,
  },

  {
    name: 'Core Industry Match',
    category: 'fit',
    field_name: 'industry',
    operator: 'contains_any',
    value:
      'healthcare|health care|medical|hospital|real estate|real estate development|institutional|commercial|construction|general contractor|property management|property development|senior living|long-term care|ltc|pharmaceutical|biotech|education|university|college|government|municipal|dental|retail|hospitality',
    score_impact: 10,
    is_active: true,
    priority: 11,
  },

  {
    name: 'Any Known Industry',
    category: 'fit',
    field_name: 'industry',
    operator: 'exists',
    value: '_',
    score_impact: 5,
    is_active: true,
    priority: 4,
  },

  {
    name: 'Existing Client Penalty',
    category: 'fit',
    field_name: 'enrichment_data.is_existing_client',
    operator: 'equals',
    value: 'true',
    score_impact: -10,
    is_active: true,
    priority: 3,
  },

  // ── INTENT RULES (cap: 35) ─────────────────────────────────────────────────

  {
    name: 'Source: Networking/Referral',
    category: 'intent',
    field_name: 'source_channel',
    operator: 'in_set',
    value: 'networking|referral',
    score_impact: 15,
    is_active: true,
    priority: 11,
  },

  {
    name: 'Source: Door Knocking',
    category: 'intent',
    field_name: 'source_channel',
    operator: 'in_set',
    value: 'door_knocking|door knocking',
    score_impact: 10,
    is_active: true,
    priority: 10,
  },

  {
    name: 'Source: Outreach/Inbound',
    category: 'intent',
    field_name: 'source_channel',
    operator: 'in_set',
    value: 'outreach|inbound|website',
    score_impact: 5,
    is_active: true,
    priority: 9,
  },

  {
    name: 'Has Project Description',
    category: 'intent',
    field_name: 'project_description',
    operator: 'exists',
    value: '_',
    score_impact: 5,
    is_active: true,
    priority: 8,
  },

  {
    name: 'Has Estimated Value',
    category: 'intent',
    field_name: 'estimated_value',
    operator: 'greater_than',
    value: '0',
    score_impact: 3,
    is_active: true,
    priority: 7,
  },

  {
    name: 'Has Timeline Urgency',
    category: 'intent',
    field_name: 'timeline_urgency',
    operator: 'exists',
    value: '_',
    score_impact: 2,
    is_active: true,
    priority: 6,
  },

  // ── ENGAGEMENT RULES (cap: 25) ─────────────────────────────────────────────

  {
    name: 'Has Notes/Activities',
    category: 'engagement',
    field_name: 'enrichment_data.activity_count',
    operator: 'greater_than',
    value: '0',
    score_impact: 5,
    is_active: true,
    priority: 7,
  },

  {
    name: 'Has Follow-Up Date',
    category: 'engagement',
    field_name: 'next_followup_at',
    operator: 'exists',
    value: '_',
    score_impact: 5,
    is_active: true,
    priority: 7,
  },

  {
    name: 'Has Email',
    category: 'engagement',
    field_name: 'email',
    operator: 'exists',
    value: '_',
    score_impact: 3,
    is_active: true,
    priority: 6,
  },

  {
    name: 'Has Phone',
    category: 'engagement',
    field_name: 'phone',
    operator: 'exists',
    value: '_',
    score_impact: 2,
    is_active: true,
    priority: 5,
  },

  {
    name: 'Is Decision Maker',
    category: 'engagement',
    field_name: 'enrichment_data.is_decision_maker',
    operator: 'equals',
    value: 'true',
    score_impact: 5,
    is_active: true,
    priority: 7,
  },
];

async function main() {
  console.log('Seeding scoring rules...');

  let inserted = 0;
  let skipped = 0;

  for (const rule of SCORING_RULES) {
    // Check if rule already exists by name + category
    const { data: existing } = await supabase
      .from('scoring_rules')
      .select('id')
      .eq('name', rule.name)
      .eq('category', rule.category)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  Skipped (exists): [${rule.category}] ${rule.name}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('scoring_rules').insert(rule);

    if (error) {
      console.error(`  Failed: [${rule.category}] ${rule.name} — ${error.message}`);
      continue;
    }

    console.log(
      `  Inserted: [${rule.category}] ${rule.name} (${rule.score_impact > 0 ? '+' : ''}${rule.score_impact})`,
    );
    inserted++;
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  console.log(`Score caps: fit:40 | intent:35 | engagement:25 | total:100`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
