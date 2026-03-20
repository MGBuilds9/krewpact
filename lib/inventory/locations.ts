/**
 * Inventory locations business logic — warehouses, job sites, vehicle locations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

type LocationRow = Database['public']['Tables']['inventory_locations']['Row'];
type LocationInsert = Database['public']['Tables']['inventory_locations']['Insert'];
type SpotRow = Database['public']['Tables']['inventory_spots']['Row'];

export interface LocationFilters {
  divisionId?: string;
  locationType?: 'warehouse' | 'job_site' | 'vehicle';
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new inventory location.
 * Validates: vehicle type requires linked_vehicle_id, job_site requires project_id.
 */
export async function createLocation(
  supabase: SupabaseClient<Database>,
  data: LocationInsert,
): Promise<LocationRow> {
  if (data.location_type === 'vehicle' && !data.linked_vehicle_id) {
    throw new Error('Vehicle locations require a linked_vehicle_id');
  }
  if (data.location_type === 'job_site' && !data.project_id) {
    throw new Error('Job site locations require a project_id');
  }

  const { data: row, error } = await supabase
    .from('inventory_locations')
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create inventory location', {
      error,
      name: data.name,
    });
    throw error;
  }

  return row;
}

/**
 * Update an inventory location by id.
 */
export async function updateLocation(
  supabase: SupabaseClient<Database>,
  id: string,
  data: Partial<LocationInsert>,
): Promise<LocationRow> {
  const { data: row, error } = await supabase
    .from('inventory_locations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update inventory location', { error, id });
    throw error;
  }

  return row;
}

/**
 * Paginated location list with filters.
 */
export async function listLocations(
  supabase: SupabaseClient<Database>,
  filters: LocationFilters,
): Promise<{ data: LocationRow[]; total: number }> {
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  let query = supabase.from('inventory_locations').select('*', { count: 'exact' });

  if (filters.divisionId) {
    query = query.eq('division_id', filters.divisionId);
  }
  if (filters.locationType) {
    query = query.eq('location_type', filters.locationType);
  }
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  query = query.order('name').range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to list inventory locations', { error, filters });
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

export type LocationWithSpots = LocationRow & { inventory_spots: SpotRow[] };

/**
 * Get a location with its spots (sub-locations within a warehouse/vehicle).
 */
export async function getLocationWithSpots(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<LocationWithSpots | null> {
  const { data: row, error } = await supabase
    .from('inventory_locations')
    .select('*, inventory_spots(id, name, sort_order, is_active)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get location with spots', { error, id });
    throw error;
  }

  return row as LocationWithSpots | null;
}
