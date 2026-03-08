/* eslint-disable no-console */
/**
 * KrewPact Demo Seed Script
 *
 * Populates Supabase with realistic MDM construction data for demo purposes.
 * Works with either service role key (bypasses RLS) or anon key (requires demo RLS policies).
 *
 * Usage: npx tsx scripts/seed-demo.ts
 *   --clean   Delete existing demo data before seeding
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and auth key in .env.local');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.warn('⚠️  No SUPABASE_SERVICE_ROLE_KEY — using anon key (requires demo RLS policies)\n');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CLEAN = process.argv.includes('--clean');

// ── Demo user (matches lib/demo-mode.ts) ─────────────────────────
const DEMO_USER_ID = 'd504ba2d-a6d8-464f-8219-7e61c5442316';

// ── Helpers ──────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function pastDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Soft insert — returns data or warns and continues
async function softInsert(
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[],
  selectCols = '*',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const { data, error } = await supabase.from(table).insert(rows).select(selectCols);
  if (error) {
    console.warn(`   ⚠️  ${table} insert warning: ${error.message}`);
    return [];
  }
  return data ?? [];
}

async function seed() {
  console.log('🏗️  KrewPact Demo Seed — starting...\n');

  // ── 1. Fetch divisions ─────────────────────────────────────
  console.log('1/7  Fetching divisions...');
  const { data: divisions, error: divErr } = await supabase.from('divisions').select('*');
  if (divErr || !divisions?.length) {
    console.error('Cannot fetch divisions:', divErr);
    process.exit(1);
  }

  const divMap: Record<string, string> = {};
  for (const d of divisions) {
    const rec = d as Record<string, unknown>;
    const nameKey = String(rec.code ?? rec.name ?? '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const canonical: Record<string, string> = {
      'mdm-contracting': 'contracting',
      'mdm-homes': 'homes',
      'mdm-wood': 'wood',
      'mdm-telecom': 'telecom',
      'mdm-group-inc': 'group-inc',
      'mdm-management': 'management',
    };
    divMap[canonical[nameKey] ?? nameKey] = rec.id as string;
  }
  console.log(`   Found ${divisions.length} divisions: ${Object.keys(divMap).join(', ')}`);

  // ── Clean existing demo data if requested ──────────────────
  if (CLEAN) {
    console.log('\n   🧹 Cleaning existing demo data...');
    // Delete in dependency order
    await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('opportunities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('scoring_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   Done cleaning.\n');
  }

  // ── 2. Verify demo user exists ─────────────────────────────
  console.log('2/7  Checking demo user...');
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', DEMO_USER_ID)
    .single();
  if (existingUser) {
    console.log('   Demo user exists.');
  } else {
    // Try to insert (may fail with anon key due to RLS)
    const { error: ue } = await supabase.from('users').insert({
      id: DEMO_USER_ID,
      email: 'michael.guirguis@mdmgroupinc.ca',
      first_name: 'Michael',
      last_name: 'Guirguis',
      status: 'active',
    });
    if (ue)
      console.warn(
        `   ⚠️  Could not create user (RLS): ${ue.message}. Proceeding without user FK links.`,
      );
    else console.log('   Created demo user.');
  }

  // Owner ID — only use if user exists
  const ownerId = existingUser ? DEMO_USER_ID : null;

  // ── 3. Seed leads ──────────────────────────────────────────
  console.log('3/7  Seeding leads...');
  const leads = [
    {
      company_name: 'Maple Ridge Developments',
      division_id: divMap['contracting'],
      source_channel: 'referral',
      status: 'new',
      industry: 'real_estate',
      city: 'Mississauga',
      province: 'Ontario',
      fit_score: 80,
      intent_score: 65,
      engagement_score: 40,
      notes: 'Office tower lobby renovation — 12,000 sqft. ~$450K est.',
    },
    {
      company_name: 'GTA Healthcare Partners',
      division_id: divMap['contracting'],
      source_channel: 'inbound',
      status: 'contacted',
      industry: 'healthcare',
      city: 'Toronto',
      province: 'Ontario',
      fit_score: 90,
      intent_score: 75,
      engagement_score: 60,
      notes: 'Medical clinic buildout — Scarborough. ~$1.2M est.',
    },
    {
      company_name: 'Brampton Burger Co.',
      division_id: divMap['contracting'],
      source_channel: 'apollo',
      status: 'qualified',
      industry: 'hospitality',
      city: 'Brampton',
      province: 'Ontario',
      fit_score: 70,
      intent_score: 85,
      engagement_score: 70,
      is_qualified: true,
      notes: 'Fast casual restaurant buildout — 2,500 sqft. ~$180K est.',
    },
    {
      company_name: 'Lakeshore Custom Homes',
      division_id: divMap['homes'],
      source_channel: 'referral',
      status: 'qualified',
      industry: 'residential',
      city: 'Oakville',
      province: 'Ontario',
      fit_score: 95,
      intent_score: 90,
      engagement_score: 80,
      is_qualified: true,
      notes: 'Luxury lakefront custom home — 5,200 sqft. ~$2.1M est.',
    },
    {
      company_name: 'Hamilton Steel Fabricators',
      division_id: divMap['contracting'],
      source_channel: 'maps',
      status: 'new',
      industry: 'manufacturing',
      city: 'Hamilton',
      province: 'Ontario',
      fit_score: 60,
      intent_score: 45,
      engagement_score: 20,
      notes: 'Warehouse expansion — mezzanine addition. ~$320K est.',
    },
    {
      company_name: 'Etobicoke Dental Group',
      division_id: divMap['contracting'],
      source_channel: 'linkedin',
      status: 'contacted',
      industry: 'healthcare',
      city: 'Etobicoke',
      province: 'Ontario',
      fit_score: 65,
      intent_score: 55,
      engagement_score: 50,
      notes: 'Dental office renovation — 3 operatories. ~$95K est.',
    },
    {
      company_name: 'Woodbridge Estates',
      division_id: divMap['homes'],
      source_channel: 'inbound',
      status: 'won',
      industry: 'residential',
      city: 'Vaughan',
      province: 'Ontario',
      fit_score: 92,
      intent_score: 95,
      engagement_score: 90,
      is_qualified: true,
      notes: 'Executive home build — finished basement, pool. $1.8M contracted.',
    },
    {
      company_name: 'Rogers Tower Refit',
      division_id: divMap['telecom'],
      source_channel: 'referral',
      status: 'qualified',
      industry: 'telecom',
      city: 'Mississauga',
      province: 'Ontario',
      fit_score: 85,
      intent_score: 70,
      engagement_score: 55,
      is_qualified: true,
      notes: 'Cell tower equipment upgrade — Hurontario corridor. ~$75K est.',
    },
    {
      company_name: 'Peel Region Property Mgmt',
      division_id: divMap['management'],
      source_channel: 'inbound',
      status: 'nurturing' as string,
      industry: 'property_management',
      city: 'Mississauga',
      province: 'Ontario',
      fit_score: 75,
      intent_score: 40,
      engagement_score: 35,
      notes: 'Multi-unit common area upgrades — 6 buildings. ~$500K est.',
    },
    {
      company_name: 'Scarborough Sushi House',
      division_id: divMap['contracting'],
      source_channel: 'apollo',
      status: 'lost',
      industry: 'hospitality',
      city: 'Scarborough',
      province: 'Ontario',
      fit_score: 55,
      intent_score: 60,
      engagement_score: 25,
      notes: 'Sushi restaurant renovation — went with competitor (lower bidder). ~$120K.',
    },
    {
      company_name: 'Erin Mills Town Centre',
      division_id: divMap['contracting'],
      source_channel: 'referral',
      status: 'contacted',
      industry: 'retail',
      city: 'Mississauga',
      province: 'Ontario',
      fit_score: 78,
      intent_score: 62,
      engagement_score: 45,
      notes: 'Anchor tenant space conversion — 8,000 sqft. ~$680K est.',
    },
    {
      company_name: 'Bell Canada Infrastructure',
      division_id: divMap['telecom'],
      source_channel: 'bidding_platform',
      status: 'new',
      industry: 'telecom',
      city: 'Toronto',
      province: 'Ontario',
      fit_score: 88,
      intent_score: 50,
      engagement_score: 15,
      notes: 'Fibre conduit installation — Downtown core. ~$250K est.',
    },
    {
      company_name: 'MDM Wood Supply — Burlington',
      division_id: divMap['wood'],
      source_channel: 'inbound',
      status: 'won',
      industry: 'construction_supply',
      city: 'Burlington',
      province: 'Ontario',
      fit_score: 70,
      intent_score: 80,
      engagement_score: 85,
      is_qualified: true,
      notes: 'Engineered lumber supply contract — Q1 2026. $90K contracted.',
    },
    {
      company_name: 'Ajax Community Centre',
      division_id: divMap['contracting'],
      source_channel: 'bidding_platform',
      status: 'qualified',
      industry: 'municipal',
      city: 'Ajax',
      province: 'Ontario',
      fit_score: 82,
      intent_score: 88,
      engagement_score: 60,
      is_qualified: true,
      notes: 'Community centre expansion — gymnasium addition. ~$1.5M est.',
    },
    {
      company_name: 'Caledon Horse Farms',
      division_id: divMap['homes'],
      source_channel: 'referral',
      status: 'new',
      industry: 'agricultural',
      city: 'Caledon',
      province: 'Ontario',
      fit_score: 72,
      intent_score: 55,
      engagement_score: 30,
      notes: 'Farmhouse renovation + barn conversion. ~$950K est.',
    },
  ];

  const insertedLeads = await softInsert('leads', leads, 'id, company_name, status, division_id');
  if (!insertedLeads.length) {
    console.error('   No leads inserted — cannot continue.');
    process.exit(1);
  }
  console.log(`   Inserted ${insertedLeads.length} leads.`);

  const leadIdByName = Object.fromEntries(insertedLeads.map((l) => [l.company_name, l.id]));

  // ── 4. Seed accounts ───────────────────────────────────────
  console.log('4/7  Seeding accounts...');
  const accounts = [
    {
      account_name: 'Woodbridge Estates Inc.',
      account_type: 'client',
      division_id: divMap['homes'],
      billing_address: {
        street: '120 Islington Ave',
        city: 'Vaughan',
        province: 'ON',
        postal_code: 'L4L 1A6',
      },
      notes: 'Converted from lead — executive home build',
      created_by: ownerId,
    },
    {
      account_name: 'MDM Wood Supply Co.',
      account_type: 'client',
      division_id: divMap['wood'],
      billing_address: {
        street: '45 Industrial Rd',
        city: 'Burlington',
        province: 'ON',
        postal_code: 'L7L 5Z9',
      },
      notes: 'Engineered lumber supply — recurring contract',
      created_by: ownerId,
    },
    {
      account_name: 'GTA Healthcare Partners',
      account_type: 'prospect',
      division_id: divMap['contracting'],
      billing_address: {
        street: '3100 Lawrence Ave E',
        city: 'Scarborough',
        province: 'ON',
        postal_code: 'M1P 2V2',
      },
      notes: 'Medical clinic chain — high value prospect',
      created_by: ownerId,
    },
    {
      account_name: 'Ajax Municipality',
      account_type: 'prospect',
      division_id: divMap['contracting'],
      billing_address: {
        street: '65 Harwood Ave S',
        city: 'Ajax',
        province: 'ON',
        postal_code: 'L1S 2H9',
      },
      notes: 'Community centre expansion bid — pre-qualified',
      created_by: ownerId,
    },
    {
      account_name: 'Rogers Communications',
      account_type: 'client',
      division_id: divMap['telecom'],
      billing_address: {
        street: '1 Rogers St',
        city: 'Toronto',
        province: 'ON',
        postal_code: 'M4M 1J3',
      },
      notes: 'Ongoing telecom infrastructure — tower refits',
      created_by: ownerId,
    },
    {
      account_name: 'Peel Region Housing Authority',
      account_type: 'prospect',
      division_id: divMap['management'],
      billing_address: {
        street: '10 Peel Centre Dr',
        city: 'Brampton',
        province: 'ON',
        postal_code: 'L6T 4B9',
      },
      notes: 'Property management — multi-unit upgrades',
      created_by: ownerId,
    },
  ];

  const insertedAccounts = await softInsert('accounts', accounts, 'id, account_name');
  console.log(`   Inserted ${insertedAccounts.length} accounts.`);
  const accMap = Object.fromEntries(insertedAccounts.map((a) => [a.account_name, a.id]));

  // ── 5. Seed contacts (linked to leads — Sales AGI schema) ──
  console.log('5/7  Seeding contacts...');
  const contacts = [
    {
      lead_id: leadIdByName['Woodbridge Estates'],
      full_name: 'Frank Rossi',
      first_name: 'Frank',
      last_name: 'Rossi',
      email: 'frank.rossi@woodbridgeestates.ca',
      phone: '+1-905-555-0201',
      title: 'Owner',
      is_primary: true,
    },
    {
      lead_id: leadIdByName['Woodbridge Estates'],
      full_name: 'Maria Rossi',
      first_name: 'Maria',
      last_name: 'Rossi',
      email: 'maria.rossi@woodbridgeestates.ca',
      phone: '+1-905-555-0202',
      title: 'Co-Owner',
    },
    {
      lead_id: leadIdByName['MDM Wood Supply — Burlington'],
      full_name: 'James Chen',
      first_name: 'James',
      last_name: 'Chen',
      email: 'j.chen@mdmwoodsupply.ca',
      phone: '+1-905-555-0301',
      title: 'Purchasing Manager',
      is_primary: true,
    },
    {
      lead_id: leadIdByName['GTA Healthcare Partners'],
      full_name: 'Dr. Sarah Patel',
      first_name: 'Sarah',
      last_name: 'Patel',
      email: 's.patel@gtahealthcare.ca',
      phone: '+1-416-555-0401',
      title: 'Managing Director',
      is_primary: true,
    },
    {
      lead_id: leadIdByName['GTA Healthcare Partners'],
      full_name: 'Omar Hassan',
      first_name: 'Omar',
      last_name: 'Hassan',
      email: 'o.hassan@gtahealthcare.ca',
      phone: '+1-416-555-0402',
      title: 'Facilities Manager',
    },
    {
      lead_id: leadIdByName['Ajax Community Centre'],
      full_name: 'Robert Kim',
      first_name: 'Robert',
      last_name: 'Kim',
      email: 'r.kim@ajax.ca',
      phone: '+1-905-555-0501',
      title: 'Infrastructure Committee Chair',
      is_primary: true,
    },
    {
      lead_id: leadIdByName['Rogers Tower Refit'],
      full_name: 'Priya Sharma',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'p.sharma@rogers.com',
      phone: '+1-416-555-0601',
      title: 'Network Deployment Lead',
      is_primary: true,
    },
    {
      lead_id: leadIdByName['Rogers Tower Refit'],
      full_name: 'Kevin MacDonald',
      first_name: 'Kevin',
      last_name: 'MacDonald',
      email: 'k.macdonald@rogers.com',
      phone: '+1-416-555-0602',
      title: 'Site Acquisition Specialist',
    },
    {
      lead_id: leadIdByName['Peel Region Property Mgmt'],
      full_name: 'Linda Thompson',
      first_name: 'Linda',
      last_name: 'Thompson',
      email: 'l.thompson@peelregion.ca',
      phone: '+1-905-555-0701',
      title: 'Director of Capital Projects',
      is_primary: true,
    },
    {
      lead_id: leadIdByName['Caledon Horse Farms'],
      full_name: 'David Nguyen',
      first_name: 'David',
      last_name: 'Nguyen',
      email: 'd.nguyen@caledonfarms.ca',
      phone: '+1-905-555-0702',
      title: 'Property Owner',
      is_primary: true,
    },
  ];

  const insertedContacts = await softInsert('contacts', contacts, 'id, full_name, lead_id');
  console.log(`   Inserted ${insertedContacts.length} contacts.`);

  // ── 6. Seed opportunities ──────────────────────────────────
  console.log('6/7  Seeding opportunities...');
  const opportunities = [
    {
      opportunity_name: 'Woodbridge Executive Home Build',
      lead_id: leadIdByName['Woodbridge Estates'],
      account_id: accMap['Woodbridge Estates Inc.'],
      division_id: divMap['homes'],
      stage: 'contracted',
      estimated_revenue: 1800000,
      probability_pct: 100,
      target_close_date: pastDate(5),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'GTA Healthcare — Scarborough Clinic',
      account_id: accMap['GTA Healthcare Partners'],
      division_id: divMap['contracting'],
      stage: 'estimating',
      estimated_revenue: 1200000,
      probability_pct: 45,
      target_close_date: futureDate(45),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'Ajax Community Centre Expansion',
      account_id: accMap['Ajax Municipality'],
      division_id: divMap['contracting'],
      stage: 'proposal',
      estimated_revenue: 1500000,
      probability_pct: 55,
      target_close_date: futureDate(60),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'Rogers Tower Refit — Hurontario',
      account_id: accMap['Rogers Communications'],
      division_id: divMap['telecom'],
      stage: 'negotiation',
      estimated_revenue: 75000,
      probability_pct: 75,
      target_close_date: futureDate(14),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'Brampton Burger Co. Buildout',
      division_id: divMap['contracting'],
      stage: 'site_visit',
      estimated_revenue: 180000,
      probability_pct: 30,
      target_close_date: futureDate(30),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'Erin Mills Retail Conversion',
      division_id: divMap['contracting'],
      stage: 'intake',
      estimated_revenue: 680000,
      probability_pct: 15,
      target_close_date: futureDate(90),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'Peel Region Multi-Unit Upgrades',
      account_id: accMap['Peel Region Housing Authority'],
      division_id: divMap['management'],
      stage: 'estimating',
      estimated_revenue: 500000,
      probability_pct: 40,
      target_close_date: futureDate(75),
      owner_user_id: ownerId,
    },
    {
      opportunity_name: 'Lakeshore Luxury Home',
      division_id: divMap['homes'],
      stage: 'proposal',
      estimated_revenue: 2100000,
      probability_pct: 60,
      target_close_date: futureDate(30),
      owner_user_id: ownerId,
    },
  ];

  const insertedOpps = await softInsert('opportunities', opportunities, 'id, opportunity_name');
  console.log(`   Inserted ${insertedOpps.length} opportunities.`);
  const oppIdByName = Object.fromEntries(insertedOpps.map((o) => [o.opportunity_name, o.id]));

  // ── 7. Seed activities ─────────────────────────────────────
  console.log('7/7  Seeding activities + projects + scoring rules...');
  const activities = [
    {
      lead_id: leadIdByName['Maple Ridge Developments'],
      activity_type: 'call',
      title: 'Initial outreach call',
      details: 'Left voicemail with project manager. Will follow up Thursday.',
      due_at: daysAgo(2),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['GTA Healthcare Partners'],
      activity_type: 'email',
      title: 'Sent capabilities deck',
      details: 'Emailed MDM healthcare portfolio to Dr. Patel.',
      completed_at: daysAgo(5),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['GTA Healthcare Partners'],
      activity_type: 'meeting',
      title: 'Site walkthrough — Scarborough',
      details: 'Toured existing space with Dr. Patel and Omar. Noted HVAC constraints.',
      completed_at: daysAgo(1),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Brampton Burger Co.'],
      activity_type: 'call',
      title: 'Qualification call',
      details: 'Owner confirmed budget range $150-200K. Timeline: open April.',
      completed_at: daysAgo(3),
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['Ajax Community Centre Expansion'],
      activity_type: 'meeting',
      title: 'Pre-bid meeting',
      details: 'Attended municipal pre-bid meeting. 4 contractors invited.',
      completed_at: daysAgo(7),
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['Ajax Community Centre Expansion'],
      activity_type: 'email',
      title: 'RFP clarification questions',
      details: 'Submitted 8 clarification questions on structural specs.',
      completed_at: daysAgo(4),
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['Rogers Tower Refit — Hurontario'],
      activity_type: 'call',
      title: 'Pricing negotiation',
      details: 'Priya requested 5% discount on equipment install. Countered with 3%.',
      completed_at: daysAgo(2),
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['Woodbridge Executive Home Build'],
      activity_type: 'meeting',
      title: 'Design review with client',
      details: 'Frank and Maria approved final floor plans. Breaking ground next week.',
      completed_at: daysAgo(10),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Etobicoke Dental Group'],
      activity_type: 'email',
      title: 'Follow-up on dental reno inquiry',
      details: 'Sent scope outline and rough estimate range.',
      completed_at: daysAgo(6),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Bell Canada Infrastructure'],
      activity_type: 'note',
      title: 'Bid portal registration',
      details: 'Registered on Bell procurement portal. Awaiting pre-qual approval.',
      completed_at: daysAgo(1),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Erin Mills Town Centre'],
      activity_type: 'meeting',
      title: 'Initial site assessment',
      details: 'Walked the anchor tenant space with property manager. Good fit for MDM.',
      due_at: futureDate(3) + 'T14:00:00.000Z',
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['GTA Healthcare — Scarborough Clinic'],
      activity_type: 'task',
      title: 'Prepare cost estimate',
      details: 'Use clinic buildout template. Include mechanical/electrical allowances.',
      due_at: futureDate(5) + 'T09:00:00.000Z',
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['Lakeshore Luxury Home'],
      activity_type: 'email',
      title: 'Sent proposal package',
      details: 'Proposal includes 3D renderings, detailed line items, and payment schedule.',
      completed_at: daysAgo(3),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Peel Region Property Mgmt'],
      activity_type: 'call',
      title: 'Nurture touchpoint',
      details: 'Checked in with Linda. Project still in budget approval. Follow up in 2 weeks.',
      completed_at: daysAgo(8),
      owner_user_id: ownerId,
    },
    {
      account_id: accMap['Rogers Communications'],
      activity_type: 'note',
      title: 'Account strategy note',
      details:
        'Rogers expanding 5G footprint in Peel Region. Opportunity for 3-5 more sites in Q2.',
      completed_at: daysAgo(1),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Caledon Horse Farms'],
      activity_type: 'call',
      title: 'Intro call with landowner',
      details: 'Spoke with property owner about barn conversion. Very interested.',
      completed_at: daysAgo(2),
      owner_user_id: ownerId,
    },
    {
      opportunity_id: oppIdByName['Peel Region Multi-Unit Upgrades'],
      activity_type: 'meeting',
      title: 'Building inspection tour',
      details: 'Inspected 3 of 6 buildings. Common areas need HVAC, flooring, lighting.',
      completed_at: daysAgo(4),
      owner_user_id: ownerId,
    },
    {
      lead_id: leadIdByName['Hamilton Steel Fabricators'],
      activity_type: 'email',
      title: 'Cold outreach — mezzanine',
      details: 'Sent intro email about MDM industrial capabilities. No response yet.',
      completed_at: daysAgo(9),
      owner_user_id: ownerId,
    },
  ];

  await softInsert('activities', activities);
  console.log(`   Activities: ${activities.length} inserted.`);

  // Projects
  const projects = [
    {
      project_name: 'Woodbridge Executive Home',
      project_number: 'MDM-H-2026-001',
      division_id: divMap['homes'],
      account_id: accMap['Woodbridge Estates Inc.'],
      status: 'active',
      site_address: {
        street: '88 Lakeview Crescent',
        city: 'Vaughan',
        province: 'ON',
        postal_code: 'L4L 8R2',
      },
      baseline_budget: 1800000,
      current_budget: 1850000,
      start_date: pastDate(15),
      target_completion_date: futureDate(180),
      created_by: ownerId,
    },
    {
      project_name: 'Rogers Hurontario Tower Upgrade',
      project_number: 'MDM-T-2026-001',
      division_id: divMap['telecom'],
      account_id: accMap['Rogers Communications'],
      status: 'planning',
      site_address: {
        street: 'Hurontario St & Eglinton Ave',
        city: 'Mississauga',
        province: 'ON',
        postal_code: 'L5B 1P7',
      },
      baseline_budget: 75000,
      current_budget: 75000,
      start_date: futureDate(14),
      target_completion_date: futureDate(45),
      created_by: ownerId,
    },
    {
      project_name: 'Burlington Lumber Supply Agreement',
      project_number: 'MDM-W-2026-001',
      division_id: divMap['wood'],
      account_id: accMap['MDM Wood Supply Co.'],
      status: 'active',
      site_address: {
        street: '45 Industrial Rd',
        city: 'Burlington',
        province: 'ON',
        postal_code: 'L7L 5Z9',
      },
      baseline_budget: 90000,
      current_budget: 90000,
      start_date: pastDate(30),
      target_completion_date: futureDate(90),
      created_by: ownerId,
    },
    {
      project_name: 'MDM HQ Office Refresh',
      project_number: 'MDM-G-2026-001',
      division_id: divMap['group-inc'],
      status: 'active',
      site_address: {
        street: '6750 Century Ave',
        city: 'Mississauga',
        province: 'ON',
        postal_code: 'L5N 2V8',
      },
      baseline_budget: 45000,
      current_budget: 48000,
      start_date: pastDate(20),
      target_completion_date: futureDate(10),
      created_by: ownerId,
    },
  ];

  await softInsert('projects', projects);
  console.log(`   Projects: ${projects.length} inserted.`);

  // Scoring rules
  const scoringRules = [
    {
      rule_name: 'GTA location',
      category: 'fit',
      field_name: 'city',
      operator: 'in',
      value: 'Mississauga,Toronto,Brampton,Vaughan,Oakville',
      points: 15,
    },
    {
      rule_name: 'Inbound lead',
      category: 'intent',
      field_name: 'source_channel',
      operator: 'equals',
      value: 'inbound',
      points: 20,
    },
    {
      rule_name: 'Healthcare industry',
      category: 'fit',
      field_name: 'industry',
      operator: 'equals',
      value: 'healthcare',
      points: 10,
    },
  ];

  await softInsert('scoring_rules', scoringRules);
  console.log(`   Scoring rules: ${scoringRules.length} inserted.`);

  // ── Summary ────────────────────────────────────────────────
  console.log('\n✅ Demo seed complete!');
  console.log(`   - ${insertedLeads.length} leads across divisions`);
  console.log(`   - ${insertedAccounts.length} accounts`);
  console.log(`   - ${insertedContacts.length} contacts`);
  console.log(`   - ${insertedOpps.length} opportunities across pipeline stages`);
  console.log(`   - ${activities.length} activities`);
  console.log(`   - ${projects.length} projects`);
  console.log(`   - ${scoringRules.length} scoring rules`);
  console.log('\nRun `npm run dev` and navigate to /dashboard to see the data.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
