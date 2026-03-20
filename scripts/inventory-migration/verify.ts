/**
 * Verify Almyta migration by comparing source CSVs with Supabase data.
 *
 * Usage: npx tsx scripts/inventory-migration/verify.ts
 *
 * Compares:
 * - Parts count vs inventory_items count per division
 * - SUM(InStock * curCost) vs SUM(value_change) per division
 * - PartsActive count vs inventory_serials count per division
 * - Categories count vs inventory_item_categories count per division
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerificationRow {
  metric: string;
  division: string;
  source: number;
  destination: number;
  match: boolean;
  delta: number;
}

interface CSVRow {
  [key: string]: string;
}

// Division mapping — must match transform.ts
const DIVISION_MAP: Record<string, string> = {
  'MDM_Telecom_Inc.': 'PLACEHOLDER_TELECOM_DIVISION_UUID',
  MDM_Wood_Industries: 'PLACEHOLDER_WOOD_DIVISION_UUID',
  'MDM_Contracting_Inc.': 'PLACEHOLDER_CONTRACTING_DIVISION_UUID',
};

const DIVISION_LABELS: Record<string, string> = {
  'MDM_Telecom_Inc.': 'Telecom',
  MDM_Wood_Industries: 'Wood',
  'MDM_Contracting_Inc.': 'Contracting',
};

// ---------------------------------------------------------------------------
// CSV reader (same parser as transform.ts)
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

async function readCSV(filePath: string): Promise<CSVRow[]> {
  if (!existsSync(filePath)) return [];

  const rows: CSVRow[] = [];
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  let lineBuffer = '';

  for await (const rawLine of rl) {
    lineBuffer += (lineBuffer ? '\n' : '') + rawLine;
    const quoteCount = (lineBuffer.match(/"/g) ?? []).length;
    if (quoteCount % 2 !== 0) continue;

    const line = lineBuffer;
    lineBuffer = '';

    if (!headers) {
      headers = parseCSVLine(line);
      continue;
    }

    const values = parseCSVLine(line);
    const row: CSVRow = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const EXPORTS_DIR = join(SCRIPT_DIR, 'exports');
const COMPANIES = ['MDM_Telecom_Inc.', 'MDM_Wood_Industries', 'MDM_Contracting_Inc.'];

async function run(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log('=== Almyta Migration Verification ===\n');

  const results: VerificationRow[] = [];

  for (const company of COMPANIES) {
    const divisionId = DIVISION_MAP[company];
    const label = DIVISION_LABELS[company];

    console.log(`Checking ${label}...`);

    // -- Source counts from CSVs --
    const parts = await readCSV(join(EXPORTS_DIR, `${company}_Parts.csv`));
    const validParts = parts.filter((p) => {
      const partNo = parseInt(p.PartNo, 10);
      return !isNaN(partNo) && partNo >= 0;
    });

    const categories = await readCSV(join(EXPORTS_DIR, `${company}_Categories.csv`));
    const validCategories = categories.filter(
      (c) => c.Category?.trim() && c.Category.trim() !== '…' && c.Category.trim() !== '...',
    );

    const partsActive = await readCSV(join(EXPORTS_DIR, `${company}_PartsActive.csv`));
    const validSerials = partsActive.filter((p) => p.Serial?.trim());

    // Source stock value
    let sourceStockValue = 0;
    let sourceStockCount = 0;
    for (const p of validParts) {
      const inStock = parseFloat(p.InStock);
      const curCost = parseFloat(p.curCost);
      if (inStock > 0) {
        sourceStockCount++;
        sourceStockValue += inStock * (isNaN(curCost) ? 0 : curCost);
      }
    }
    sourceStockValue = parseFloat(sourceStockValue.toFixed(2));

    // -- Destination counts from Supabase --
    const { count: destItemCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('division_id', divisionId);

    const { count: destCategoryCount } = await supabase
      .from('inventory_item_categories')
      .select('*', { count: 'exact', head: true })
      .eq('division_id', divisionId);

    const { count: destSerialCount } = await supabase
      .from('inventory_serials')
      .select('*', { count: 'exact', head: true })
      .eq('division_id', divisionId);

    const { count: destLedgerCount } = await supabase
      .from('inventory_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('division_id', divisionId)
      .eq('transaction_type', 'initial_stock');

    // Destination stock value (sum of value_change for initial_stock)
    const { data: ledgerData } = await supabase
      .from('inventory_ledger')
      .select('value_change')
      .eq('division_id', divisionId)
      .eq('transaction_type', 'initial_stock');

    const destStockValue = parseFloat(
      (ledgerData ?? []).reduce((sum, row) => sum + Number(row.value_change), 0).toFixed(2),
    );

    // -- Build comparison rows --
    const itemCount = destItemCount ?? 0;
    const catCount = destCategoryCount ?? 0;
    const serialCount = destSerialCount ?? 0;
    const ledgerCount = destLedgerCount ?? 0;

    results.push({
      metric: 'Items (Parts)',
      division: label,
      source: validParts.length,
      destination: itemCount,
      match: validParts.length === itemCount,
      delta: itemCount - validParts.length,
    });

    results.push({
      metric: 'Categories',
      division: label,
      source: validCategories.length,
      destination: catCount,
      match: validCategories.length === catCount,
      delta: catCount - validCategories.length,
    });

    results.push({
      metric: 'Serials (Active)',
      division: label,
      source: validSerials.length,
      destination: serialCount,
      match: validSerials.length === serialCount,
      delta: serialCount - validSerials.length,
    });

    results.push({
      metric: 'Initial Stock Entries',
      division: label,
      source: sourceStockCount,
      destination: ledgerCount,
      match: sourceStockCount === ledgerCount,
      delta: ledgerCount - sourceStockCount,
    });

    results.push({
      metric: 'Stock Value ($)',
      division: label,
      source: sourceStockValue,
      destination: destStockValue,
      match: Math.abs(sourceStockValue - destStockValue) < 0.01,
      delta: parseFloat((destStockValue - sourceStockValue).toFixed(2)),
    });
  }

  // -- Print results table --
  console.log('\n');
  const colWidths = { metric: 22, division: 14, source: 14, dest: 14, match: 8, delta: 12 };
  const header =
    'Metric'.padEnd(colWidths.metric) +
    'Division'.padEnd(colWidths.division) +
    'Source'.padStart(colWidths.source) +
    'Supabase'.padStart(colWidths.dest) +
    'Match'.padStart(colWidths.match) +
    'Delta'.padStart(colWidths.delta);
  console.log(header);
  console.log('='.repeat(header.length));

  let allMatch = true;
  for (const r of results) {
    const matchStr = r.match ? 'OK' : 'MISMATCH';
    if (!r.match) allMatch = false;

    console.log(
      r.metric.padEnd(colWidths.metric) +
        r.division.padEnd(colWidths.division) +
        String(r.source).padStart(colWidths.source) +
        String(r.destination).padStart(colWidths.dest) +
        matchStr.padStart(colWidths.match) +
        String(r.delta).padStart(colWidths.delta),
    );
  }

  console.log('='.repeat(header.length));

  if (allMatch) {
    console.log('\nVERIFICATION PASSED: All source and destination counts match.');
  } else {
    const mismatches = results.filter((r) => !r.match);
    console.log(`\nVERIFICATION FAILED: ${mismatches.length} mismatches found.`);
    console.log('Review the delta column for discrepancies.');
    console.log('\nCommon causes:');
    console.log('  - Negative PartNo system records filtered during transform');
    console.log('  - PartsActive entries without serial numbers skipped');
    console.log('  - Duplicate categories deduplicated across divisions');
    console.log('  - Rounding differences in stock value calculations');
  }
}

run().catch((err: unknown) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
