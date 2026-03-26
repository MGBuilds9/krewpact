'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface PurchaseOrderLine {
  id: string;
  po_id: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  total_cost: number;
  uom: string;
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  status:
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'ordered'
    | 'partial_received'
    | 'received'
    | 'cancelled';
  supplier_id: string;
  supplier_name: string | null;
  division_id: string;
  project_id: string | null;
  delivery_location_id: string | null;
  order_date: string | null;
  expected_delivery_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  lines: PurchaseOrderLine[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceipt {
  id: string;
  po_id: string;
  receipt_number: string;
  status: 'draft' | 'confirmed';
  received_by: string | null;
  received_at: string | null;
  location_id: string;
  notes: string | null;
  created_at: string;
}

export interface GoodsReceiptLine {
  receipt_id: string;
  po_line_id: string;
  item_id: string;
  qty_received: number;
  spot_id: string | null;
  notes: string | null;
}

export interface CreateGoodsReceiptInput {
  po_id: string;
  location_id: string;
  notes?: string;
  lines: Omit<GoodsReceiptLine, 'receipt_id'>[];
}

interface UsePurchaseOrdersOptions {
  status?: string;
  supplierId?: string;
  divisionId?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

export function usePurchaseOrders(options?: UsePurchaseOrdersOptions) {
  const { status, supplierId, divisionId, projectId, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.purchaseOrders.list({
      status,
      supplierId,
      divisionId,
      projectId,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<PurchaseOrder>('/api/inventory/purchase-orders', {
        params: {
          status,
          supplier_id: supplierId,
          division_id: divisionId,
          project_id: projectId,
          limit,
          offset,
        },
      }),
    staleTime: 30_000,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: () => apiFetch<PurchaseOrder>(`/api/inventory/purchase-orders/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PurchaseOrder>) =>
      apiFetch<PurchaseOrder>('/api/inventory/purchase-orders', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
    },
  });
}

export function useApprovePo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrder>(`/api/inventory/purchase-orders/${id}/approve`, { method: 'POST' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(id),
      });
    },
  });
}

export function useSubmitPo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrder>(`/api/inventory/purchase-orders/${id}/submit`, { method: 'POST' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(id),
      });
    },
  });
}

export function useCancelPo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrder>(`/api/inventory/purchase-orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(id),
      });
    },
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoodsReceiptInput) =>
      apiFetch<GoodsReceipt>('/api/inventory/goods-receipts', {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(variables.po_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryStock.all,
      });
    },
  });
}

export function useConfirmGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, poId: _poId }: { id: string; poId: string }) =>
      apiFetch<GoodsReceipt>(`/api/inventory/goods-receipts/${id}/confirm`, { method: 'POST' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(variables.poId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryStock.all,
      });
    },
  });
}
