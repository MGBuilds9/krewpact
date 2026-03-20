'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface FleetVehicle {
  id: string;
  unit_number: string;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  vehicle_type: string;
  division_id: string;
  status: 'active' | 'maintenance' | 'decommissioned';
  assigned_to: string | null;
  location_id: string | null;
  insurance_expiry: string | null;
  last_inspection_date: string | null;
  odometer_reading: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface CreateVehicleInput extends Partial<FleetVehicle> {
  auto_create_location?: boolean;
}

interface UseFleetVehiclesOptions {
  divisionId?: string;
  status?: string;
  vehicleType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useFleetVehicles(options?: UseFleetVehiclesOptions) {
  const { divisionId, status, vehicleType, search, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.fleetVehicles.list({
      divisionId,
      status,
      vehicleType,
      search,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<FleetVehicle>('/api/inventory/fleet-vehicles', {
        params: {
          division_id: divisionId,
          status,
          vehicle_type: vehicleType,
          search,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useFleetVehicle(id: string) {
  return useQuery({
    queryKey: queryKeys.fleetVehicles.detail(id),
    queryFn: () => apiFetch<FleetVehicle>(`/api/inventory/fleet-vehicles/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      apiFetch<FleetVehicle>('/api/inventory/fleet-vehicles', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fleetVehicles.all,
      });
      // Creating a vehicle with auto_create_location may add a location
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryLocations.all,
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<FleetVehicle> & { id: string }) =>
      apiFetch<FleetVehicle>(`/api/inventory/fleet-vehicles/${id}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fleetVehicles.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.fleetVehicles.detail(variables.id),
      });
    },
  });
}

export function useDecommissionVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/inventory/fleet-vehicles/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fleetVehicles.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryLocations.all,
      });
    },
  });
}
