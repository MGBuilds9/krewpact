/**
 * Transform extracted Almyta CSVs into KrewPact-ready JSON for Supabase import.
 *
 * Usage: npx tsx scripts/inventory-migration/transform.ts
 *
 * Reads from:  scripts/inventory-migration/exports/
 * Writes to:   scripts/inventory-migration/transformed/
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

// ---------------------------------------------------------------------------
// Types for Almyta CSV rows
// ---------------------------------------------------------------------------

interface AlmytaPart {
  PartNo: string;
  ShortID: string;
  Description: string;
  UOM: string;
  Category: string;
  curCost: string;
  curPrice: string;
  InStock: string;
  OnOrder: string;
  UseSerial: string;
  Notes: string;
  Warehouse: string;
  Location: string;
  ManModel: string;
  LeadTime: string;
  ReOrder: string;
  EconoOrder: string;
  Created: string;
  Modified: string;
  subCategory: string;
  Buy: string;
  Sell: string;
  Make: string;
  PutUp: string;
  Units: string;
  PNetWeight: string;
  PGrossWeight: string;
  [key: string]: string;
}

interface AlmytaCategory {
  Rec: string;
  Category: string;
  Use: string;
  Private: string;
  subCategory: string;
  Description: string;
  [key: string]: string;
}

interface AlmytaUOM {
  UOMID: string;
  UOM: string;
  Conversion: string;
  [key: string]: string;
}

interface AlmytaPartsActive {
  Part: string;
  Received: string;
  Shipped: string;
  'Date In': string;
  'Date Out': string;
  Serial: string;
  Net: string;
  Gross: string;
  Units: string;
  Warehouse: string;
  Spot: string;
  Active: string;
  RecNo: string;
  UnitPrice: string;
  CurValue: string;
  Serial2: string;
  [key: string]: string;
}

interface AlmytaVendorCatalog {
  Rec: string;
  VID: string;
  PartNo: string;
  vPart: string;
  UOM: string;
  PutUp: string;
  UnitCost: string;
  LeadTime: string;
  [key: string]: string;
}

interface AlmytaVendor {
  Rec: string;
  ShortID: string;
  Name: string;
  Contact1: string;
  Phone: string;
  Email: string;
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// KrewPact target types
// ---------------------------------------------------------------------------

type InventoryUom =
  | 'each'
  | 'meter'
  | 'foot'
  | 'spool'
  | 'box'
  | 'kg'
  | 'lb'
  | 'liter'
  | 'pack'
  | 'roll'
  | 'sheet'
  | 'pair';

interface KrewpactCategory {
  id: string;
  name: string;
  division_id: string;
  sort_order: number;
}

interface KrewpactItem {
  id: string;
  name: string;
  sku: string;
  division_id: string;
  unit_of_measure: InventoryUom;
  tracking_type: 'none' | 'serial' | 'lot';
  valuation_method: 'weighted_average';
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

interface KrewpactLedgerEntry {
  id: string;
  item_id: string;
  division_id: string;
  transaction_type: 'initial_stock';
  qty_change: number;
  valuation_rate: number;
  value_change: number;
  location_id: string; // placeholder — needs a default location per division
  transacted_by: string; // system migration user
  notes: string;
}

interface KrewpactSerial {
  id: string;
  item_id: string;
  division_id: string;
  serial_number: string;
  secondary_serial: string | null;
  status: 'in_stock' | 'checked_out' | 'decommissioned';
  almyta_rec_id: number;
  acquisition_cost: number | null;
}

interface VendorMapping {
  almyta_vendor_id: string;
  almyta_vendor_name: string;
  almyta_vendor_short_id: string;
  company: string;
  // Supplier-item relationships (for manual linking post-migration)
  items: Array<{
    almyta_part_no: number;
    supplier_part_number: string;
    supplier_price: number;
    lead_days: number;
  }>;
}

// ---------------------------------------------------------------------------
// Division mapping — set via DIVISION_MAP env var (JSON object)
// Example: DIVISION_MAP='{"MDM_Telecom_Inc.":"<uuid>","MDM_Wood_Industries":"<uuid>"}'
// ---------------------------------------------------------------------------
const DIVISION_MAP: Record<string, string> = JSON.parse(process.env.DIVISION_MAP || '{}');

// Default location IDs per division (for initial_stock ledger entries)
// These must be created in inventory_locations before running load.ts
// Set via DEFAULT_LOCATION_MAP env var (JSON object)
const DEFAULT_LOCATION_MAP: Record<string, string> = JSON.parse(process.env.DEFAULT_LOCATION_MAP || '{}');

// System user for migration entries — set via MIGRATION_USER_ID env var
const MIGRATION_USER_ID = process.env.MIGRATION_USER_ID || '';

// ---------------------------------------------------------------------------
// UOM mapping: Almyta UOMID → KrewPact inventory_uom enum
// ---------------------------------------------------------------------------
const UOM_ID_MAP: Record<string, InventoryUom> = {
  '-1': 'each', // N/A → default to each
  '0': 'each', // "…" (placeholder)
  '1': 'each',
  '2': 'meter',
  '3': 'foot',
  '4': 'pack',
  '5': 'box',
  '6': 'roll',
  '7': 'spool',
  '8': 'pair',
  '9': 'sheet',
  '10': 'kg',
  '11': 'lb',
  '12': 'liter',
};

// Fallback: match UOM name strings → enum (used if ID mapping misses)
const UOM_NAME_MAP: Record<string, InventoryUom> = {
  each: 'each',
  ea: 'each',
  pc: 'each',
  pcs: 'each',
  piece: 'each',
  unit: 'each',
  meter: 'meter',
  m: 'meter',
  metres: 'meter',
  foot: 'foot',
  feet: 'foot',
  ft: 'foot',
  spool: 'spool',
  box: 'box',
  bx: 'box',
  carton: 'box',
  kg: 'kg',
  kilogram: 'kg',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  liter: 'liter',
  litre: 'liter',
  l: 'liter',
  pack: 'pack',
  pk: 'pack',
  roll: 'roll',
  rl: 'roll',
  sheet: 'sheet',
  sht: 'sheet',
  pair: 'pair',
  pr: 'pair',
};

// ---------------------------------------------------------------------------
// CSV parser (simple, handles quoted fields with commas and newlines)
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
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

async function readCSV<T extends Record<string, string>>(filePath: string): Promise<T[]> {
  if (!existsSync(filePath)) {
    console.warn(`  SKIP: ${filePath} not found`);
    return [];
  }

  const rows: T[] = [];
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  let lineBuffer = '';

  for await (const rawLine of rl) {
    lineBuffer += (lineBuffer ? '\n' : '') + rawLine;

    // Check if we have balanced quotes (handle multiline fields)
    const quoteCount = (lineBuffer.match(/"/g) ?? []).length;
    if (quoteCount % 2 !== 0) continue; // Unbalanced quotes — accumulate

    const line = lineBuffer;
    lineBuffer = '';

    if (!headers) {
      headers = parseCSVLine(line);
      continue;
    }

    const values = parseCSVLine(line);
    const row = {} as Record<string, string>;
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? '';
    }
    rows.push(row as T);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// UUID generation
// ---------------------------------------------------------------------------
function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

async function buildUomMap(company: string): Promise<Map<string, InventoryUom>> {
  const uomRows = await readCSV<AlmytaUOM>(join(EXPORTS_DIR, `${company}_UOM.csv`));
  const map = new Map<string, InventoryUom>();
  for (const uom of uomRows) {
    const mapped = UOM_ID_MAP[uom.UOMID] ?? UOM_NAME_MAP[uom.UOM.toLowerCase()] ?? null;
    if (mapped) map.set(uom.UOMID, mapped);
  }
  console.log(`  UOM entries: ${uomRows.length} (${map.size} mapped)`);
  return map;
}

async function buildCategoryMap(
  company: string,
  divisionId: string,
  globalCatIdMap: Map<string, string>,
  outCategories: KrewpactCategory[],
): Promise<Map<string, string>> {
  const catRows = await readCSV<AlmytaCategory>(join(EXPORTS_DIR, `${company}_Categories.csv`));
  const companyCatMap = new Map<string, string>();
  let catOrder = 0;

  for (const cat of catRows) {
    const name = cat.Category?.trim();
    if (!name || name === '…' || name === '...') continue;

    const key = `${divisionId}::${name.toLowerCase()}`;
    let catId = globalCatIdMap.get(key);
    if (!catId) {
      catId = uuid();
      globalCatIdMap.set(key, catId);
      outCategories.push({ id: catId, name, division_id: divisionId, sort_order: catOrder++ });
    }
    companyCatMap.set(cat.Rec, catId);
  }
  console.log(`  Categories: ${companyCatMap.size}`);
  return companyCatMap;
}

interface TransformPartsOptions {
  company: string;
  divisionId: string;
  locationId: string;
  companyUomMap: Map<string, InventoryUom>;
  companyCatMap: Map<string, string>;
}

interface PartsResult {
  parts: AlmytaPart[];
  partIdMap: Map<string, string>;
  partCount: number;
  skippedCount: number;
  stockCount: number;
}

function positiveFloatOrNull(raw: string | undefined): number | null {
  const v = parseFloat(raw ?? '');
  return v > 0 ? v : null;
}

function resolveUom(part: AlmytaPart, companyUomMap: Map<string, InventoryUom>): InventoryUom {
  const uomId = part.UOM?.trim() ?? '1';
  return companyUomMap.get(uomId) ?? UOM_ID_MAP[uomId] ?? 'each';
}

function resolvePartSku(part: AlmytaPart, partNo: number, company: string): string {
  const shortId = part.ShortID?.trim();
  return shortId || `ALM-${company.substring(4, 7).toUpperCase()}-${partNo}`;
}

function buildItemFromPart(
  part: AlmytaPart,
  partNo: number,
  itemId: string,
  opts: TransformPartsOptions,
): KrewpactItem {
  const shortId = part.ShortID?.trim() || null;
  const description = part.Description?.trim() || null;
  const sku = resolvePartSku(part, partNo, opts.company);
  const useSerial = part.UseSerial?.trim() === '1' || part.UseSerial?.trim() === '-1';
  return {
    id: itemId, name: description ?? sku, sku, division_id: opts.divisionId,
    unit_of_measure: resolveUom(part, opts.companyUomMap),
    tracking_type: useSerial ? 'serial' : 'none',
    valuation_method: 'weighted_average', is_active: true,
    almyta_part_no: partNo, almyta_short_id: shortId, description,
    category_id: opts.companyCatMap.get(part.Category?.trim() ?? '') ?? null,
    manufacturer: part.ManModel?.trim() || null,
    min_stock_level: positiveFloatOrNull(part.ReOrder),
    reorder_qty: positiveFloatOrNull(part.EconoOrder),
    weight_net: positiveFloatOrNull(part.PNetWeight),
    weight_gross: positiveFloatOrNull(part.PGrossWeight),
  };
}

function buildLedgerEntry(
  part: AlmytaPart,
  partNo: number,
  itemId: string,
  opts: TransformPartsOptions,
): KrewpactLedgerEntry | null {
  const inStock = parseFloat(part.InStock);
  if (inStock <= 0) return null;
  const curCost = parseFloat(part.curCost);
  const safeRate = isNaN(curCost) ? 0 : curCost;
  return {
    id: uuid(), item_id: itemId, division_id: opts.divisionId,
    transaction_type: 'initial_stock', qty_change: inStock, valuation_rate: safeRate,
    value_change: parseFloat((inStock * safeRate).toFixed(2)),
    location_id: opts.locationId, transacted_by: MIGRATION_USER_ID,
    notes: `Almyta migration — ${opts.company} PartNo ${partNo}`,
  };
}

async function transformParts(
  opts: TransformPartsOptions,
  outItems: KrewpactItem[],
  outLedger: KrewpactLedgerEntry[],
): Promise<PartsResult> {
  const parts = await readCSV<AlmytaPart>(join(EXPORTS_DIR, `${opts.company}_Parts.csv`));
  const partIdMap = new Map<string, string>();
  let partCount = 0;
  let skippedCount = 0;
  let stockCount = 0;

  for (const part of parts) {
    const partNo = parseInt(part.PartNo, 10);
    if (isNaN(partNo) || partNo < 0) { skippedCount++; continue; }

    const itemId = uuid();
    partIdMap.set(part.PartNo, itemId);
    outItems.push(buildItemFromPart(part, partNo, itemId, opts));

    const ledgerEntry = buildLedgerEntry(part, partNo, itemId, opts);
    if (ledgerEntry) { outLedger.push(ledgerEntry); stockCount++; }
    partCount++;
  }
  return { parts, partIdMap, partCount, skippedCount, stockCount };
}

interface TransformSerialsOptions {
  company: string;
  divisionId: string;
  parts: AlmytaPart[];
  partIdMap: Map<string, string>;
}

function resolveItemIdByShortId(
  partRef: string,
  parts: AlmytaPart[],
  partIdMap: Map<string, string>,
): string | undefined {
  for (const part of parts) {
    if (part.ShortID?.trim() === partRef) return partIdMap.get(part.PartNo);
  }
  return undefined;
}

async function transformSerials(
  opts: TransformSerialsOptions,
  outSerials: KrewpactSerial[],
): Promise<number> {
  const actives = await readCSV<AlmytaPartsActive>(join(EXPORTS_DIR, `${opts.company}_PartsActive.csv`));
  let serialCount = 0;

  for (const active of actives) {
    const partRef = active.Part?.trim();
    const serialNum = active.Serial?.trim();
    if (!partRef || !serialNum) continue;

    const itemId = resolveItemIdByShortId(partRef, opts.parts, opts.partIdMap);
    if (!itemId) continue;

    const recNo = parseInt(active.RecNo, 10);
    const unitPrice = parseFloat(active.UnitPrice);
    outSerials.push({
      id: uuid(), item_id: itemId, division_id: opts.divisionId,
      serial_number: serialNum, secondary_serial: active.Serial2?.trim() || null,
      status: active.Active?.trim() === '1' ? 'in_stock' : 'decommissioned',
      almyta_rec_id: isNaN(recNo) ? 0 : recNo,
      acquisition_cost: isNaN(unitPrice) ? null : unitPrice,
    });
    serialCount++;
  }
  return serialCount;
}

function ensureVendorEntry(
  vid: string,
  company: string,
  vendor: AlmytaVendor,
  vendorItems: Map<string, VendorMapping>,
): void {
  if (!vendorItems.has(vid)) {
    vendorItems.set(vid, {
      almyta_vendor_id: vid,
      almyta_vendor_name: vendor.Name?.trim() ?? '',
      almyta_vendor_short_id: vendor.ShortID?.trim() ?? '',
      company, items: [],
    });
  }
}

function addVendorCatalogEntry(
  vc: AlmytaVendorCatalog,
  company: string,
  vendorMap: Map<string, AlmytaVendor>,
  vendorItems: Map<string, VendorMapping>,
): void {
  const vid = vc.VID?.trim();
  if (!vid || vid === '0') return;
  const vendor = vendorMap.get(vid);
  if (!vendor) return;

  ensureVendorEntry(vid, company, vendor, vendorItems);

  const partNo = parseInt(vc.PartNo, 10);
  if (isNaN(partNo) || partNo < 0) return;
  vendorItems.get(vid)!.items.push({
    almyta_part_no: partNo,
    supplier_part_number: vc.vPart?.trim() ?? '',
    supplier_price: parseFloat(vc.UnitCost) || 0,
    lead_days: parseInt(vc.LeadTime, 10) || 0,
  });
}

async function buildVendorMappings(
  company: string,
  outMappings: VendorMapping[],
): Promise<number> {
  const vendors = await readCSV<AlmytaVendor>(join(EXPORTS_DIR, `${company}_Vendor.csv`));
  const vendorMap = new Map<string, AlmytaVendor>();
  for (const v of vendors) {
    if (v.Rec && v.Name?.trim() && v.Name.trim() !== '…') vendorMap.set(v.Rec, v);
  }

  const vendorCatalog = await readCSV<AlmytaVendorCatalog>(
    join(EXPORTS_DIR, `${company}_VendorCatalog.csv`),
  );
  const vendorItems = new Map<string, VendorMapping>();
  for (const vc of vendorCatalog) {
    addVendorCatalogEntry(vc, company, vendorMap, vendorItems);
  }

  for (const mapping of vendorItems.values()) {
    if (mapping.items.length > 0) outMappings.push(mapping);
  }
  return vendorItems.size;
}

// ---------------------------------------------------------------------------
// Transform logic
// ---------------------------------------------------------------------------

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const EXPORTS_DIR = join(SCRIPT_DIR, 'exports');
const OUTPUT_DIR = join(SCRIPT_DIR, 'transformed');

const COMPANIES = ['MDM_Telecom_Inc.', 'MDM_Wood_Industries', 'MDM_Contracting_Inc.'];

async function run(): Promise<void> {
  if (!MIGRATION_USER_ID) throw new Error('MIGRATION_USER_ID env var required');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!existsSync(EXPORTS_DIR)) {
    console.error('ERROR: exports/ directory not found. Run extract-almyta.sh first.');
    process.exit(1);
  }

  const hasPlaceholders = Object.values(DIVISION_MAP).some((v) => v.startsWith('PLACEHOLDER'));
  if (hasPlaceholders) {
    console.warn('\nWARNING: Division UUIDs contain PLACEHOLDER values.');
    console.warn('Update DIVISION_MAP, DEFAULT_LOCATION_MAP, and MIGRATION_USER_ID');
    console.warn('with real UUIDs from Supabase before running load.ts.\n');
  }

  const allCategories: KrewpactCategory[] = [];
  const allItems: KrewpactItem[] = [];
  const allLedger: KrewpactLedgerEntry[] = [];
  const allSerials: KrewpactSerial[] = [];
  const allVendorMappings: VendorMapping[] = [];
  const categoryIdMap = new Map<string, string>();

  let totalParts = 0;
  let totalSerials = 0;
  let totalSkipped = 0;

  for (const company of COMPANIES) {
    const divisionId = DIVISION_MAP[company];
    const locationId = DEFAULT_LOCATION_MAP[company];
    console.log(`\n=== Processing: ${company} ===`);

    const companyUomMap = await buildUomMap(company);
    const companyCatMap = await buildCategoryMap(company, divisionId, categoryIdMap, allCategories);

    const partsResult = await transformParts(
      { company, divisionId, locationId, companyUomMap, companyCatMap },
      allItems, allLedger,
    );
    totalParts += partsResult.partCount;
    totalSkipped += partsResult.skippedCount;
    console.log(`  Parts: ${partsResult.partCount} items (${partsResult.skippedCount} system records skipped)`);
    console.log(`  Initial stock entries: ${partsResult.stockCount}`);

    const serialCount = await transformSerials(
      { company, divisionId, parts: partsResult.parts, partIdMap: partsResult.partIdMap },
      allSerials,
    );
    totalSerials += serialCount;
    console.log(`  Serials: ${serialCount}`);

    const vendorCount = await buildVendorMappings(company, allVendorMappings);
    console.log(`  Vendor mappings: ${vendorCount} vendors`);
  }

  // -- Write output JSON files --
  console.log('\n=== Writing transformed data ===');

  const writeJSON = (filename: string, data: unknown[]): void => {
    const filePath = join(OUTPUT_DIR, filename);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ${filename}: ${data.length} records`);
  };

  writeJSON('categories.json', allCategories);
  writeJSON('items.json', allItems);
  writeJSON('initial_stock.json', allLedger);
  writeJSON('serials.json', allSerials);
  writeJSON('vendor_mappings.json', allVendorMappings);

  // -- Write summary --
  const summary = {
    generated_at: new Date().toISOString(),
    totals: {
      categories: allCategories.length,
      items: allItems.length,
      initial_stock_entries: allLedger.length,
      serials: allSerials.length,
      vendor_mappings: allVendorMappings.length,
      skipped_system_records: totalSkipped,
    },
    per_division: COMPANIES.map((c) => ({
      company: c,
      division_id: DIVISION_MAP[c],
      items: allItems.filter((i) => i.division_id === DIVISION_MAP[c]).length,
      categories: allCategories.filter((cat) => cat.division_id === DIVISION_MAP[c]).length,
      ledger: allLedger.filter((l) => l.division_id === DIVISION_MAP[c]).length,
      serials: allSerials.filter((s) => s.division_id === DIVISION_MAP[c]).length,
    })),
    placeholder_warning: Object.values(DIVISION_MAP).some((v) => v.startsWith('PLACEHOLDER'))
      ? 'DIVISION UUIDs are placeholders — update before loading'
      : null,
  };

  writeJSON('_summary.json', [summary]);

  console.log('\n=== Transform complete ===');
  console.log(`Total items: ${totalParts}`);
  console.log(`Total initial stock entries: ${allLedger.length}`);
  console.log(`Total serials: ${totalSerials}`);
  console.log(`Total categories: ${allCategories.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

run().catch((err: unknown) => {
  console.error('Transform failed:', err);
  process.exit(1);
});
