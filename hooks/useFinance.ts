'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface InvoiceSnapshot {
  id: string;
  project_id: string;
  invoice_number: string;
  customer_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: 'draft' | 'submitted' | 'paid' | 'overdue' | 'cancelled' | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  payment_link_url: string | null;
  erp_docname: string | null;
  snapshot_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface POSnapshot {
  id: string;
  project_id: string;
  po_number: string;
  supplier_name: string | null;
  po_date: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'closed' | 'cancelled' | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  erp_docname: string | null;
  snapshot_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface JobCostSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string;
  baseline_budget: number | null;
  revised_budget: number | null;
  committed_cost: number | null;
  actual_cost: number | null;
  forecast_cost: number | null;
  forecast_margin_pct: number | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface ListResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// Invoice snapshots
// ============================================================

export function useInvoiceSnapshots(projectId?: string) {
  return useQuery({
    queryKey: ['invoice-snapshots', projectId],
    queryFn: () =>
      apiFetch<ListResponse<InvoiceSnapshot>>('/api/finance/invoices', {
        params: { project_id: projectId },
      }),
    staleTime: 30_000,
    enabled: !projectId || !!projectId,
  });
}

export function useInvoiceSnapshot(id: string) {
  return useQuery({
    queryKey: ['invoice-snapshot', id],
    queryFn: () => apiFetch<InvoiceSnapshot>(`/api/finance/invoices/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateInvoiceSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InvoiceSnapshot>) =>
      apiFetch<InvoiceSnapshot>('/api/finance/invoices', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice-snapshots'] }),
  });
}

export function useUpdateInvoiceSnapshot(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InvoiceSnapshot>) =>
      apiFetch<InvoiceSnapshot>(`/api/finance/invoices/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-snapshot', id] });
    },
  });
}

// ============================================================
// PO snapshots
// ============================================================

export function usePOSnapshots(projectId?: string) {
  return useQuery({
    queryKey: ['po-snapshots', projectId],
    queryFn: () =>
      apiFetch<ListResponse<POSnapshot>>('/api/finance/purchase-orders', {
        params: { project_id: projectId },
      }),
    staleTime: 30_000,
    enabled: !projectId || !!projectId,
  });
}

export function usePOSnapshot(id: string) {
  return useQuery({
    queryKey: ['po-snapshot', id],
    queryFn: () => apiFetch<POSnapshot>(`/api/finance/purchase-orders/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreatePOSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<POSnapshot>) =>
      apiFetch<POSnapshot>('/api/finance/purchase-orders', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['po-snapshots'] }),
  });
}

export function useUpdatePOSnapshot(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<POSnapshot>) =>
      apiFetch<POSnapshot>(`/api/finance/purchase-orders/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['po-snapshot', id] });
    },
  });
}

// ============================================================
// Job cost snapshots
// ============================================================

export function useJobCostSnapshots(projectId?: string) {
  return useQuery({
    queryKey: ['job-cost-snapshots', projectId],
    queryFn: () =>
      apiFetch<ListResponse<JobCostSnapshot>>('/api/finance/job-costs', {
        params: { project_id: projectId },
      }),
    staleTime: 30_000,
    enabled: !projectId || !!projectId,
  });
}

export function useJobCostSnapshot(id: string) {
  return useQuery({
    queryKey: ['job-cost-snapshot', id],
    queryFn: () => apiFetch<JobCostSnapshot>(`/api/finance/job-costs/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateJobCostSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<JobCostSnapshot>) =>
      apiFetch<JobCostSnapshot>('/api/finance/job-costs', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-cost-snapshots'] }),
  });
}
