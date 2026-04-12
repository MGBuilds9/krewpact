import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

export type {
  LowStockItem,
  ProjectMaterialItem,
  StockFilters,
  StockSummaryRow,
} from './stock-types';
import type {
  LowStockItem,
  ProjectMaterialItem,
  StockFilters,
  StockSummaryRow,
} from './stock-types';

// ============================================================
// getStockSummary
// ============================================================

/**
 * Retrieves paginated stock summary with item and location names.
 *
 * Uses the `inventory_stock_summary_secure` view which is a SECURITY INVOKER
 * wrapper over the materialized view. The view INNER JOINs inventory_items
 * and inventory_locations, so Supabase RLS on those tables automatically
 * filters out rows the caller is not authorized to see. No application-layer
 * RLS filtering needed.
 */
export async function getStockSummary(
  supabase: SupabaseClient<Database>,
  filters: StockFilters,
): Promise<{ data: StockSummaryRow[]; total: number }> {
  const pageLimit = filters.limit ?? 50;
  const pageOffset = filters.offset ?? 0;

  // Build the base query on the secure view (RLS via INNER JOIN)
  let query = supabase
    .from('inventory_stock_summary_secure')
    .select(
      'item_id, location_id, spot_id, qty_on_hand, total_value, last_transaction_at, item_name, item_sku, division_id, location_name',
    );

  if (filters.itemId) {
    query = query.eq('item_id', filters.itemId);
  }
  if (filters.locationId) {
    query = query.eq('location_id', filters.locationId);
  }
  if (filters.divisionId) {
    query = query.eq('division_id', filters.divisionId);
  }

  const { data: summaryData, error: summaryError } = await query.range(
    pageOffset,
    pageOffset + pageLimit - 1,
  );

  if (summaryError) {
    logger.error('Failed to query stock summary', { error: summaryError.message });
    throw new Error(`Stock summary query failed: ${summaryError.message}`);
  }

  if (!summaryData || summaryData.length === 0) {
    return { data: [], total: 0 };
  }

  // Build enriched rows directly from the view — no separate lookups needed
  let enriched: StockSummaryRow[] = summaryData.map((r) => ({
    item_id: r.item_id!,
    item_name: r.item_name ?? '',
    item_sku: r.item_sku ?? '',
    location_id: r.location_id!,
    location_name: r.location_name ?? '',
    spot_id: r.spot_id ?? null,
    qty_on_hand: Number(r.qty_on_hand ?? 0),
    total_value: Number(r.total_value ?? 0),
    last_transaction_at: r.last_transaction_at ?? null,
  }));

  // Search filter (item name or SKU)
  if (filters.search) {
    const term = filters.search.toLowerCase();
    enriched = enriched.filter(
      (r) => r.item_name.toLowerCase().includes(term) || r.item_sku.toLowerCase().includes(term),
    );
  }

  return { data: enriched, total: enriched.length };
}

// ============================================================
// getLowStockItems helpers
// ============================================================

type StockRow = { item_id: string | null; location_id: string | null; qty_on_hand: number | null };
type ItemRowBase = { id: string; name: string; sku: string | null; min_stock_level: number | null };
type LowStockRaw<T extends ItemRowBase> = { item: T; qty_on_hand: number; location_id: string };

function aggregateStockByItem(stockData: StockRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of stockData) {
    if (!row.item_id) continue;
    map.set(row.item_id, (map.get(row.item_id) ?? 0) + Number(row.qty_on_hand ?? 0));
  }
  return map;
}

function findLowStockItems<T extends ItemRowBase>(
  items: T[],
  stockData: StockRow[],
  stockByItem: Map<string, number>,
): { lowStockRaw: LowStockRaw<T>[]; locationIds: Set<string> } {
  const locationIds = new Set<string>();
  const lowStockRaw: LowStockRaw<T>[] = [];
  for (const item of items) {
    const totalQty = stockByItem.get(item.id) ?? 0;
    const minLevel = Number(item.min_stock_level ?? 0);
    if (totalQty < minLevel) {
      const primaryStock = stockData.find((s) => s.item_id === item.id);
      const locId = primaryStock?.location_id ?? '';
      if (locId) locationIds.add(locId);
      lowStockRaw.push({ item, qty_on_hand: totalQty, location_id: locId });
    }
  }
  return { lowStockRaw, locationIds };
}

// ============================================================
// getLowStockItems
// ============================================================

/**
 * Returns items where current stock is below the configured min_stock_level.
 * Joins inventory_stock_summary with inventory_items to compare thresholds.
 */
export async function getLowStockItems(
  supabase: SupabaseClient<Database>,
  divisionId?: string,
): Promise<LowStockItem[]> {
  // Get all items with a min_stock_level set
  let itemsQuery = supabase
    .from('inventory_items')
    .select('id, name, sku, min_stock_level, division_id')
    .not('min_stock_level', 'is', null)
    .gt('min_stock_level', 0);

  if (divisionId) {
    itemsQuery = itemsQuery.eq('division_id', divisionId);
  }

  const { data: items, error: itemsError } = await itemsQuery;

  if (itemsError) {
    logger.error('Failed to query items for low stock check', { error: itemsError.message });
    throw new Error(`Low stock items query failed: ${itemsError.message}`);
  }

  if (!items || items.length === 0) {
    return [];
  }

  // Get stock levels from the secure view for these items
  const itemIds = items.map((i) => i.id);
  const { data: stockData, error: stockError } = await supabase
    .from('inventory_stock_summary_secure')
    .select('item_id, location_id, qty_on_hand')
    .in('item_id', itemIds);

  if (stockError) {
    logger.error('Failed to query stock summary for low stock', { error: stockError.message });
    throw new Error(`Low stock summary query failed: ${stockError.message}`);
  }

  const stockByItem = aggregateStockByItem(stockData ?? []);
  const { lowStockRaw, locationIds } = findLowStockItems(items, stockData ?? [], stockByItem);

  // Resolve location names
  const locIds = [...locationIds];
  const locationMap = new Map<string, string>();
  if (locIds.length > 0) {
    const { data: locations } = await supabase
      .from('inventory_locations')
      .select('id, name')
      .in('id', locIds);
    for (const loc of locations ?? []) {
      locationMap.set(loc.id, loc.name);
    }
  }

  return lowStockRaw.map((r) => ({
    item_id: r.item.id,
    item_name: r.item.name,
    item_sku: r.item.sku,
    location_id: r.location_id,
    location_name: locationMap.get(r.location_id) ?? 'Unknown',
    qty_on_hand: r.qty_on_hand,
    min_stock_level: Number(r.item.min_stock_level ?? 0),
    deficit: Number(r.item.min_stock_level ?? 0) - r.qty_on_hand,
  }));
}

// ============================================================
// getStockByProject
// ============================================================

/**
 * Aggregates material usage for a specific project.
 * Groups ledger entries by item_id and sums qty/value.
 */
export async function getStockByProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<{ items: ProjectMaterialItem[]; total_cost: number }> {
  const { data, error } = await supabase
    .from('inventory_ledger')
    .select('item_id, qty_change, value_change')
    .eq('project_id', projectId);

  if (error) {
    logger.error('Failed to query project materials', { error: error.message, projectId });
    throw new Error(`Project materials query failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { items: [], total_cost: 0 };
  }

  // Aggregate by item_id
  const aggregated = new Map<string, { total_qty: number; total_value: number }>();
  for (const entry of data) {
    const existing = aggregated.get(entry.item_id) ?? { total_qty: 0, total_value: 0 };
    existing.total_qty += Number(entry.qty_change);
    existing.total_value += Number(entry.value_change);
    aggregated.set(entry.item_id, existing);
  }

  // Resolve item names
  const itemIds = [...aggregated.keys()];
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name')
    .in('id', itemIds);

  const nameMap = new Map((items ?? []).map((i) => [i.id, i.name]));

  const result: ProjectMaterialItem[] = [];
  let totalCost = 0;

  for (const [itemId, agg] of aggregated) {
    const roundedValue = Number(agg.total_value.toFixed(2));
    result.push({
      item_id: itemId,
      item_name: nameMap.get(itemId) ?? 'Unknown',
      total_qty: Number(agg.total_qty.toFixed(4)),
      total_value: roundedValue,
    });
    totalCost += roundedValue;
  }

  return {
    items: result,
    total_cost: Number(totalCost.toFixed(2)),
  };
}
