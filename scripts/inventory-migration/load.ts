/**
 * Load transformed Almyta data into Supabase.
 *
 * Usage: npx tsx scripts/inventory-migration/load.ts [--dry-run]
 *
 * Reads from:  scripts/inventory-migration/transformed/
 * Inserts into: Supabase tables in FK dependency order.
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types matching the transformed JSON structures
// ---------------------------------------------------------------------------

interface TransformedCategory {
  id: string;
  name: string;
  division_id: string;
  sort_order: number;
}

interface TransformedItem {
  id: string;
  name: string;
  sku: string;
  division_id: string;
  unit_of_measure: string;
  tracking_type: string;
  valuation_method: string;
  is_active: boolean;
  almyta_part_no: number;
  almyta_short_id: string | null;
  description: string | null;
  category_id: string | null;
  manufacturer: string | null;
  min_stock_level: number | null;
  reorder_qty: number | null;
  weight_net: number | null;
  weight_gross: number | null;
}

interface TransformedLedgerEntry {
  id: string;
  item_id: string;
  division_id: string;
  transaction_type: string;
  qty_change: number;
  valuation_rate: number;
  value_change: number;
  location_id: string;
  transacted_by: string;
  notes: string;
}

interface TransformedSerial {
  id: string;
  item_id: string;
  division_id: string;
  serial_number: string;
  secondary_serial: string | null;
  status: string;
  almyta_rec_id: number;
  acquisition_cost: number | null;
}

interface LoadResult {
  table: string;
  attempted: number;
  inserted: number;
  failed: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const TRANSFORMED_DIR = join(SCRIPT_DIR, 'transformed');
const BATCH_SIZE = 500; // Supabase recommends <=1000 rows per insert

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJSON<T>(filename: string): T[] {
  const filePath = join(TRANSFORMED_DIR, filename);
  if (!existsSync(filePath)) {
    console.error(`ERROR: ${filePath} not found. Run transform.ts first.`);
    process.exit(1);
  }
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T[];
}

/**
 * Batch insert rows into a Supabase table.
 * Processes BATCH_SIZE rows at a time, logs progress, collects errors.
 */
async function batchInsert<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
): Promise<LoadResult> {
  const result: LoadResult = {
    table,
    attempted: rows.length,
    inserted: 0,
    failed: 0,
    errors: [],
  };

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would insert ${rows.length} rows into ${table}`);
    result.inserted = rows.length;
    return result;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    process.stdout.write(`  ${table}: batch ${batchNum}/${totalBatches} (${batch.length} rows)...`);

    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      result.failed += batch.length;
      const errMsg = `Batch ${batchNum}: ${error.message}`;
      result.errors.push(errMsg);
      console.log(` FAILED: ${error.message}`);

      // If batch fails, try inserting one-by-one to find the bad rows
      if (batch.length > 1) {
        console.log(`    Retrying batch ${batchNum} row-by-row...`);
        let recovered = 0;
        for (const row of batch) {
          const { error: rowError } = await supabase.from(table).insert(row);
          if (rowError) {
            result.errors.push(
              `Row error: ${rowError.message} — ${JSON.stringify(row).substring(0, 200)}`,
            );
          } else {
            recovered++;
            result.failed--;
            result.inserted++;
          }
        }
        console.log(`    Recovered ${recovered}/${batch.length} rows`);
      }
    } else {
      result.inserted += batch.length;
      console.log(' OK');
    }

    // Progress log every 10 batches
    if (batchNum % 10 === 0) {
      const pct = Math.round((i / rows.length) * 100);
      console.log(`  Progress: ${pct}% (${result.inserted} inserted, ${result.failed} failed)`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  // Validate env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Set these in .env.local or export them before running.');
    process.exit(1);
  }

  // Check for placeholder UUIDs
  const summary = loadJSON<Record<string, unknown>>('_summary.json');
  const firstSummary = summary[0];
  if (firstSummary && typeof firstSummary === 'object') {
    const warning = (firstSummary as Record<string, unknown>).placeholder_warning;
    if (warning) {
      console.error('ERROR: Transformed data contains placeholder UUIDs.');
      console.error('Update DIVISION_MAP in transform.ts with real UUIDs and re-run transform.');
      process.exit(1);
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  if (DRY_RUN) {
    console.log('=== DRY RUN MODE — no data will be inserted ===\n');
  }

  console.log('=== Loading transformed Almyta data into Supabase ===\n');

  const results: LoadResult[] = [];

  // 1. Categories (no FK dependencies)
  console.log('Step 1/4: inventory_item_categories');
  const categories = loadJSON<TransformedCategory>('categories.json');
  results.push(
    await batchInsert(
      supabase,
      'inventory_item_categories',
      categories as unknown as Record<string, unknown>[],
    ),
  );

  // 2. Items (depends on categories)
  console.log('\nStep 2/4: inventory_items');
  const items = loadJSON<TransformedItem>('items.json');
  results.push(
    await batchInsert(supabase, 'inventory_items', items as unknown as Record<string, unknown>[]),
  );

  // 3. Serials (depends on items)
  console.log('\nStep 3/4: inventory_serials');
  const serials = loadJSON<TransformedSerial>('serials.json');
  if (serials.length > 0) {
    results.push(
      await batchInsert(
        supabase,
        'inventory_serials',
        serials as unknown as Record<string, unknown>[],
      ),
    );
  } else {
    console.log('  No serial records to insert.');
    results.push({ table: 'inventory_serials', attempted: 0, inserted: 0, failed: 0, errors: [] });
  }

  // 4. Initial stock ledger entries (depends on items + locations)
  console.log('\nStep 4/4: inventory_ledger (initial_stock)');
  const ledger = loadJSON<TransformedLedgerEntry>('initial_stock.json');
  if (ledger.length > 0) {
    results.push(
      await batchInsert(
        supabase,
        'inventory_ledger',
        ledger as unknown as Record<string, unknown>[],
      ),
    );
  } else {
    console.log('  No initial stock entries to insert.');
    results.push({ table: 'inventory_ledger', attempted: 0, inserted: 0, failed: 0, errors: [] });
  }

  // -- Summary --
  console.log('\n=== Load Summary ===');
  console.log('');
  console.log(
    `${'Table'.padEnd(35)} ${'Attempted'.padStart(10)} ${'Inserted'.padStart(10)} ${'Failed'.padStart(10)}`,
  );
  console.log('-'.repeat(70));

  let totalFailed = 0;
  for (const r of results) {
    console.log(
      `${r.table.padEnd(35)} ${String(r.attempted).padStart(10)} ${String(r.inserted).padStart(10)} ${String(r.failed).padStart(10)}`,
    );
    totalFailed += r.failed;
  }

  console.log('-'.repeat(70));

  if (totalFailed > 0) {
    console.log(`\nWARNING: ${totalFailed} rows failed to insert.`);
    console.log('Error details:');
    for (const r of results) {
      if (r.errors.length > 0) {
        console.log(`\n  ${r.table}:`);
        // Only show first 10 errors per table
        for (const err of r.errors.slice(0, 10)) {
          console.log(`    - ${err}`);
        }
        if (r.errors.length > 10) {
          console.log(`    ... and ${r.errors.length - 10} more errors`);
        }
      }
    }
  } else {
    console.log('\nAll rows inserted successfully.');
  }

  console.log('\nNOTE: Vendor-item mappings are in vendor_mappings.json for manual linking.');
  console.log('      They require portal_accounts (suppliers) to exist first.');
}

run().catch((err: unknown) => {
  console.error('Load failed:', err);
  process.exit(1);
});
