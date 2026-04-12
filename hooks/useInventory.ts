'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList, apiFetchPaginated } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  uom: string;
  tracking_type: 'none' | 'serial' | 'lot';
  min_stock_level: number | null;
  max_stock_level: number | null;
  reorder_point: number | null;
  reorder_qty: number | null;
  unit_cost: number | null;
  division_id: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface StockSummaryItem {
  item_id: string;
  item_name: string;
  item_sku: string;
  location_id: string;
  location_name: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  unit_cost: number | null;
  total_value: number | null;
}

export interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  qty_on_hand: number;
  min_stock_level: number;
  reorder_point: number | null;
  division_id: string;
}

export interface ProjectStockSummary {
  item_id: string;
  item_name: string;
  item_sku: string;
  qty_consumed: number;
  unit_cost: number | null;
  total_cost: number | null;
}

interface UseInventoryItemsOptions {
  search?: string;
  divisionId?: string;
  category?: string;
  trackingType?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export function useInventoryItems(options?: UseInventoryItemsOptions) {
  const { search, divisionId, category, trackingType, isActive, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.inventoryItems.list({
      search,
      divisionId,
      category,
      trackingType,
      isActive,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<InventoryItem>('/api/inventory/items', {
        params: {
          search,
          division_id: divisionId,
          category,
          tracking_type: trackingType,
          is_active: isActive,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useInventoryItemsPaginated(options?: UseInventoryItemsOptions) {
  const { search, divisionId, category, trackingType, isActive, limit, offset } = options ?? {};

  return useQuery({
    queryKey: [
      ...queryKeys.inventoryItems.list({
        search,
        divisionId,
        category,
        trackingType,
        isActive,
        limit,
        offset,
      }),
      'paginated',
    ],
    queryFn: () =>
      apiFetchPaginated<InventoryItem>('/api/inventory/items', {
        params: {
          search,
          division_id: divisionId,
          category,
          tracking_type: trackingType,
          is_active: isActive,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: queryKeys.inventoryItems.detail(id),
    queryFn: () => apiFetch<InventoryItem>(`/api/inventory/items/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      apiFetch<InventoryItem>('/api/inventory/items', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems.all });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InventoryItem> & { id: string }) =>
      apiFetch<InventoryItem>(`/api/inventory/items/${id}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryItems.detail(variables.id),
      });
    },
  });
}

interface UseInventoryStockOptions {
  locationId?: string;
  divisionId?: string;
  itemId?: string;
  limit?: number;
  offset?: number;
}

export function useInventoryStock(options?: UseInventoryStockOptions) {
  const { locationId, divisionId, itemId, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.inventoryStock.list({
      locationId,
      divisionId,
      itemId,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<StockSummaryItem>('/api/inventory/stock', {
        params: {
          location_id: locationId,
          division_id: divisionId,
          item_id: itemId,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useInventoryStockPaginated(options?: UseInventoryStockOptions) {
  const { locationId, divisionId, itemId, limit, offset } = options ?? {};

  return useQuery({
    queryKey: [
      ...queryKeys.inventoryStock.list({
        locationId,
        divisionId,
        itemId,
        limit,
        offset,
      }),
      'paginated',
    ],
    queryFn: () =>
      apiFetchPaginated<StockSummaryItem>('/api/inventory/stock', {
        params: {
          location_id: locationId,
          division_id: divisionId,
          item_id: itemId,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function useStockByProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.inventoryStock.byProject(projectId),
    queryFn: () =>
      apiFetchList<ProjectStockSummary>(`/api/inventory/stock/by-project/${projectId}`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useLowStockItems(divisionId?: string) {
  return useQuery({
    queryKey: queryKeys.inventoryStock.lowStock(divisionId),
    queryFn: () =>
      apiFetchList<LowStockItem>('/api/inventory/stock/low-stock', {
        params: { division_id: divisionId },
      }),
    staleTime: 30_000,
  });
}

export interface ItemSupplier {
  id: string;
  item_id: string;
  supplier_id: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  supplier_part_number: string | null;
  supplier_price: number | null;
  lead_days: number | null;
  pack_size: number | null;
  is_preferred: boolean;
}

export function useItemSuppliers(itemId: string) {
  return useQuery({
    queryKey: queryKeys.inventoryItems.suppliers(itemId),
    queryFn: () => apiFetch<ItemSupplier[]>(`/api/inventory/items/${itemId}/suppliers`),
    enabled: !!itemId,
    staleTime: 60_000,
  });
}

export function useAddItemSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...data
    }: {
      itemId: string;
      supplier_id: string;
      supplier_part_number?: string;
      supplier_price?: number;
      lead_days?: number;
      pack_size?: number;
      is_preferred?: boolean;
    }) => apiFetch(`/api/inventory/items/${itemId}/suppliers`, { method: 'POST', body: data }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryItems.suppliers(vars.itemId),
      });
    },
  });
}

export function useRemoveItemSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, supplierId }: { itemId: string; supplierId: string }) =>
      apiFetch(`/api/inventory/items/${itemId}/suppliers?supplierId=${supplierId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryItems.suppliers(vars.itemId),
      });
    },
  });
}

export interface StockAdjustmentPayload {
  item_id: string;
  location_id: string;
  division_id: string;
  qty_change: number;
  reason_code: string;
  notes?: string;
}

export interface StockAdjustmentResult {
  id: string;
  item_id: string;
  location_id: string;
  qty_change: number;
  transaction_type: string;
  reason_code: string | null;
  notes: string | null;
  transacted_at: string;
}

export function useStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StockAdjustmentPayload) =>
      apiFetch<StockAdjustmentResult>('/api/inventory/adjustments', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryStock.all });
    },
  });
}
