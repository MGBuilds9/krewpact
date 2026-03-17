/**
 * Seed reference data for MDM Group.
 *
 * Seeds three reference data sets:
 *   - project_types    : residential, commercial, industrial, institutional, infrastructure
 *   - trade_categories : electrical, plumbing, HVAC, framing, drywall, roofing, concrete, excavation, telecom
 *   - regions          : GTA, Durham, Peel, York, Halton, Hamilton
 *
 * Idempotent — upserts on set_key / (data_set_id, value_key). Safe to re-run.
 *
 * Usage: npx tsx scripts/seed-reference-data.ts
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

interface RefValue {
  value_key: string;
  value_name: string;
  sort_order: number;
  metadata?: Record<string, unknown>;
}

interface RefSet {
  set_key: string;
  set_name: string;
  values: RefValue[];
}

const REFERENCE_DATA: RefSet[] = [
  {
    set_key: 'project_types',
    set_name: 'Project Types',
    values: [
      { value_key: 'residential', value_name: 'Residential', sort_order: 1 },
      { value_key: 'commercial', value_name: 'Commercial', sort_order: 2 },
      { value_key: 'industrial', value_name: 'Industrial', sort_order: 3 },
      { value_key: 'institutional', value_name: 'Institutional', sort_order: 4 },
      { value_key: 'infrastructure', value_name: 'Infrastructure', sort_order: 5 },
    ],
  },
  {
    set_key: 'trade_categories',
    set_name: 'Trade Categories',
    values: [
      { value_key: 'electrical', value_name: 'Electrical', sort_order: 1 },
      { value_key: 'plumbing', value_name: 'Plumbing', sort_order: 2 },
      { value_key: 'hvac', value_name: 'HVAC', sort_order: 3 },
      { value_key: 'framing', value_name: 'Framing', sort_order: 4 },
      { value_key: 'drywall', value_name: 'Drywall', sort_order: 5 },
      { value_key: 'roofing', value_name: 'Roofing', sort_order: 6 },
      { value_key: 'concrete', value_name: 'Concrete', sort_order: 7 },
      { value_key: 'excavation', value_name: 'Excavation', sort_order: 8 },
      { value_key: 'telecom', value_name: 'Telecom', sort_order: 9 },
    ],
  },
  {
    set_key: 'regions',
    set_name: 'Regions',
    values: [
      {
        value_key: 'gta',
        value_name: 'GTA',
        sort_order: 1,
        metadata: { description: 'Greater Toronto Area' },
      },
      {
        value_key: 'durham',
        value_name: 'Durham',
        sort_order: 2,
        metadata: { description: 'Durham Region (Ajax, Pickering, Oshawa, Whitby)' },
      },
      {
        value_key: 'peel',
        value_name: 'Peel',
        sort_order: 3,
        metadata: { description: 'Peel Region (Mississauga, Brampton, Caledon)' },
      },
      {
        value_key: 'york',
        value_name: 'York',
        sort_order: 4,
        metadata: { description: 'York Region (Vaughan, Markham, Richmond Hill, Newmarket)' },
      },
      {
        value_key: 'halton',
        value_name: 'Halton',
        sort_order: 5,
        metadata: { description: 'Halton Region (Burlington, Oakville, Milton, Halton Hills)' },
      },
      {
        value_key: 'hamilton',
        value_name: 'Hamilton',
        sort_order: 6,
        metadata: { description: 'Hamilton (City of Hamilton)' },
      },
    ],
  },
];

async function upsertSet(set: RefSet): Promise<string> {
  const { data, error } = await supabase
    .from('reference_data_sets')
    .upsert(
      { set_key: set.set_key, set_name: set.set_name, status: 'active' },
      { onConflict: 'set_key' },
    )
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert set "${set.set_key}": ${error?.message}`);
  }
  return data.id as string;
}

async function upsertValues(
  dataSetId: string,
  values: RefValue[],
): Promise<{ inserted: number; updated: number }> {
  const rows = values.map((v) => ({
    data_set_id: dataSetId,
    value_key: v.value_key,
    value_name: v.value_name,
    sort_order: v.sort_order,
    metadata: v.metadata ?? {},
    is_active: true,
  }));

  const { error, count } = await supabase
    .from('reference_data_values')
    .upsert(rows, { onConflict: 'data_set_id,value_key', count: 'exact' });

  if (error) {
    throw new Error(`Failed to upsert values: ${error.message}`);
  }

  return { inserted: count ?? rows.length, updated: 0 };
}

async function main() {
  console.log('Seeding reference data...');

  for (const set of REFERENCE_DATA) {
    console.log(`\n  Set: ${set.set_name} (${set.set_key})`);

    const setId = await upsertSet(set);
    console.log(`    Upserted set (id: ${setId})`);

    const result = await upsertValues(setId, set.values);
    console.log(`    Upserted ${result.inserted} values`);

    for (const v of set.values) {
      console.log(`      - ${v.value_name} (${v.value_key})`);
    }
  }

  const totalValues = REFERENCE_DATA.reduce((sum, s) => sum + s.values.length, 0);
  console.log(`\nDone: ${REFERENCE_DATA.length} sets, ${totalValues} values`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
