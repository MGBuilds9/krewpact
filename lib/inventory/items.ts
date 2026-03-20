/**
 * Inventory items business logic — CRUD, filtering, soft-delete.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

type ItemRow = Database['public']['Tables']['inventory_items']['Row'];
type ItemInsert = Database['public']['Tables']['inventory_items']['Insert'];

export interface ItemFilters {
  divisionId?: string;
  categoryId?: string;
  trackingType?: 'none' | 'serial' | 'lot';
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new inventory item with sensible defaults.
 */
export async function createItem(
  supabase: SupabaseClient<Database>,
  data: ItemInsert,
): Promise<ItemRow> {
  const payload: ItemInsert = {
    is_active: true,
    tracking_type: 'none',
    valuation_method: 'weighted_average',
    ...data,
  };

  const { data: row, error } = await supabase
    .from('inventory_items')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create inventory item', { error, sku: data.sku });
    throw error;
  }

  return row;
}

/** Fields that must never be updated by callers. */
const IMMUTABLE_FIELDS = ['org_id', 'created_at', 'created_by'] as const;

/**
 * Update an inventory item by id. Strips immutable fields.
 */
export async function updateItem(
  supabase: SupabaseClient<Database>,
  id: string,
  data: Partial<ItemInsert>,
): Promise<ItemRow> {
  const sanitized = { ...data };
  for (const field of IMMUTABLE_FIELDS) {
    delete (sanitized as Record<string, unknown>)[field];
  }

  const { data: row, error } = await supabase
    .from('inventory_items')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update inventory item', { error, id });
    throw error;
  }

  return row;
}

/**
 * Get a single item by id. Includes category name via join.
 */
export async function getItem(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ItemRow | null> {
  const { data: row, error } = await supabase
    .from('inventory_items')
    .select('*, inventory_item_categories(name)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get inventory item', { error, id });
    throw error;
  }

  return row;
}

/**
 * Paginated item list with filters. Search matches name or sku.
 */
export async function listItems(
  supabase: SupabaseClient<Database>,
  filters: ItemFilters,
): Promise<{ data: ItemRow[]; total: number }> {
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  let query = supabase
    .from('inventory_items')
    .select('*, inventory_item_categories(name)', { count: 'exact' });

  if (filters.divisionId) {
    query = query.eq('division_id', filters.divisionId);
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.trackingType) {
    query = query.eq('tracking_type', filters.trackingType);
  }
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
  }

  query = query.order('name').range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to list inventory items', { error, filters });
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

/**
 * Soft-delete — sets is_active to false.
 */
export async function deactivateItem(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ItemRow> {
  const { data: row, error } = await supabase
    .from('inventory_items')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to deactivate inventory item', { error, id });
    throw error;
  }

  return row;
}
