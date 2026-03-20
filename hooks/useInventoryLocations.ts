'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface InventoryLocation {
  id: string;
  name: string;
  location_type: 'warehouse' | 'job_site' | 'vehicle' | 'yard' | 'virtual';
  division_id: string;
  address: Record<string, string> | null;
  vehicle_id: string | null;
  parent_location_id: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LocationSpot {
  id: string;
  location_id: string;
  label: string;
  zone: string | null;
  row: string | null;
  shelf: string | null;
  bin: string | null;
  is_active: boolean;
}

export interface LocationWithSpots extends InventoryLocation {
  spots: LocationSpot[];
}

interface UseInventoryLocationsOptions {
  locationType?: string;
  divisionId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export function useInventoryLocations(options?: UseInventoryLocationsOptions) {
  const { locationType, divisionId, isActive, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.inventoryLocations.list({
      locationType,
      divisionId,
      isActive,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<InventoryLocation>('/api/inventory/locations', {
        params: {
          location_type: locationType,
          division_id: divisionId,
          is_active: isActive,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useLocationWithSpots(id: string) {
  return useQuery({
    queryKey: queryKeys.inventoryLocations.detail(id),
    queryFn: () => apiFetch<LocationWithSpots>(`/api/inventory/locations/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<InventoryLocation>) =>
      apiFetch<InventoryLocation>('/api/inventory/locations', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryLocations.all,
      });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InventoryLocation> & { id: string }) =>
      apiFetch<InventoryLocation>(`/api/inventory/locations/${id}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryLocations.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryLocations.detail(variables.id),
      });
    },
  });
}
