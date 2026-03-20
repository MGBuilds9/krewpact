'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface SerialItem {
  id: string;
  serial_number: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  status: 'available' | 'checked_out' | 'maintenance' | 'retired' | 'lost';
  location_id: string | null;
  location_name: string | null;
  checked_out_to: string | null;
  checked_out_at: string | null;
  expected_return_date: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  condition: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SerialHistoryEntry {
  id: string;
  serial_id: string;
  action: 'checkout' | 'return' | 'transfer' | 'maintenance' | 'retire';
  from_location_id: string | null;
  to_location_id: string | null;
  performed_by: string;
  performed_at: string;
  notes: string | null;
}

export interface SerialWithHistory extends SerialItem {
  history: SerialHistoryEntry[];
}

interface CheckoutSerialInput {
  serialId: string;
  checked_out_to: string;
  expected_return_date?: string;
  notes?: string;
}

interface ReturnSerialInput {
  serialId: string;
  location_id: string;
  condition?: string;
  notes?: string;
}

interface UseSerialsOptions {
  status?: string;
  locationId?: string;
  itemId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useSerials(options?: UseSerialsOptions) {
  const { status, locationId, itemId, search, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.serials.list({
      status,
      locationId,
      itemId,
      search,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<SerialItem>('/api/inventory/serials', {
        params: {
          status,
          location_id: locationId,
          item_id: itemId,
          search,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useSerial(id: string) {
  return useQuery({
    queryKey: queryKeys.serials.detail(id),
    queryFn: () => apiFetch<SerialWithHistory>(`/api/inventory/serials/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCheckoutSerial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serialId, ...data }: CheckoutSerialInput) =>
      apiFetch<SerialItem>(`/api/inventory/serials/${serialId}/checkout`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serials.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.serials.detail(variables.serialId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryStock.all,
      });
    },
  });
}

export function useReturnSerial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serialId, ...data }: ReturnSerialInput) =>
      apiFetch<SerialItem>(`/api/inventory/serials/${serialId}/return`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serials.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.serials.detail(variables.serialId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryStock.all,
      });
    },
  });
}
