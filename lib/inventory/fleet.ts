/**
 * Fleet vehicles business logic — CRUD, decommission, auto-location creation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

type FleetRow = Database['public']['Tables']['fleet_vehicles']['Row'];
type FleetInsert = Database['public']['Tables']['fleet_vehicles']['Insert'];
type LocationRow = Database['public']['Tables']['inventory_locations']['Row'];

export interface FleetFilters {
  divisionId?: string;
  vehicleType?: string;
  status?: 'active' | 'maintenance' | 'decommissioned';
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a fleet vehicle. Optionally auto-creates a linked inventory location.
 */
export async function createVehicle(
  supabase: SupabaseClient<Database>,
  data: FleetInsert,
  autoCreateLocation?: boolean,
): Promise<{ vehicle: FleetRow; location?: LocationRow }> {
  const { data: vehicle, error } = await supabase
    .from('fleet_vehicles')
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create fleet vehicle', {
      error,
      unitNumber: data.unit_number,
    });
    throw error;
  }

  let location: LocationRow | undefined;

  if (autoCreateLocation) {
    const { data: loc, error: locError } = await supabase
      .from('inventory_locations')
      .insert({
        name: `Vehicle - ${data.unit_number}`,
        location_type: 'vehicle' as const,
        linked_vehicle_id: vehicle.id,
        division_id: data.division_id,
        is_active: true,
      })
      .select()
      .single();

    if (locError) {
      logger.error('Failed to auto-create location for vehicle', {
        error: locError,
        vehicleId: vehicle.id,
      });
      throw locError;
    }

    location = loc;
  }

  return { vehicle, location };
}

/**
 * Update a fleet vehicle by id.
 */
export async function updateVehicle(
  supabase: SupabaseClient<Database>,
  id: string,
  data: Partial<FleetInsert>,
): Promise<FleetRow> {
  const { data: row, error } = await supabase
    .from('fleet_vehicles')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update fleet vehicle', { error, id });
    throw error;
  }

  return row;
}

/**
 * Paginated fleet vehicle list with filters.
 * Search matches unit_number, make, model, or vin.
 */
export async function listVehicles(
  supabase: SupabaseClient<Database>,
  filters: FleetFilters,
): Promise<{ data: FleetRow[]; total: number }> {
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  let query = supabase.from('fleet_vehicles').select('*', { count: 'exact' });

  if (filters.divisionId) {
    query = query.eq('division_id', filters.divisionId);
  }
  if (filters.vehicleType) {
    query = query.eq('vehicle_type', filters.vehicleType as FleetRow['vehicle_type']);
  }
  if (filters.status) {
    query = query.eq('status', filters.status as FleetRow['status']);
  }
  if (filters.search) {
    query = query.or(
      `unit_number.ilike.%${filters.search}%,make.ilike.%${filters.search}%,model.ilike.%${filters.search}%,vin.ilike.%${filters.search}%`,
    );
  }

  query = query.order('unit_number').range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to list fleet vehicles', { error, filters });
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

/**
 * Decommission a vehicle: set status to decommissioned, is_active to false.
 * Also deactivates the linked inventory location if one exists.
 */
export async function decommissionVehicle(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<FleetRow> {
  const { data: vehicle, error } = await supabase
    .from('fleet_vehicles')
    .update({ status: 'decommissioned', is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to decommission fleet vehicle', { error, id });
    throw error;
  }

  // Deactivate linked inventory location(s)
  const { error: locError } = await supabase
    .from('inventory_locations')
    .update({ is_active: false })
    .eq('linked_vehicle_id', id);

  if (locError) {
    logger.warn('Failed to deactivate linked location for decommissioned vehicle', {
      error: locError,
      vehicleId: id,
    });
    // Non-fatal: vehicle was already decommissioned successfully
  }

  return vehicle;
}
