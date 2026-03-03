'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// --- Types ---

export interface Estimate {
  id: string;
  estimate_number: string;
  division_id: string;
  opportunity_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  status: string;
  currency_code: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  revision_no: number;
  lines?: EstimateLine[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateLine {
  id: string;
  estimate_id: string;
  parent_line_id: string | null;
  line_type: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  markup_pct: number;
  line_total: number;
  is_optional: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EstimateVersion {
  id: string;
  estimate_id: string;
  revision_no: number;
  snapshot: Record<string, unknown>;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

// --- Filter interfaces ---

interface EstimateFilters {
  divisionId?: string;
  status?: string;
  opportunityId?: string;
  limit?: number;
  offset?: number;
}

// --- Estimates ---

export function useEstimates(filters?: EstimateFilters) {
  return useQuery({
    queryKey: ['estimates', filters],
    queryFn: () =>
      apiFetch<Estimate[]>('/api/estimates', {
        params: {
          division_id: filters?.divisionId,
          status: filters?.status,
          opportunity_id: filters?.opportunityId,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
  });
}

export function useEstimate(id: string) {
  return useQuery({
    queryKey: ['estimate', id],
    queryFn: () => apiFetch<Estimate>(`/api/estimates/${id}`),
    enabled: !!id,
  });
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Estimate>) =>
      apiFetch<Estimate>('/api/estimates', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Estimate> & { id: string }) =>
      apiFetch<Estimate>(`/api/estimates/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimate', variables.id] });
    },
  });
}

export function useDeleteEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/estimates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
}

// --- Estimate Lines ---

export function useEstimateLines(estimateId: string) {
  return useQuery({
    queryKey: ['estimateLines', estimateId],
    queryFn: () => apiFetch<EstimateLine[]>(`/api/estimates/${estimateId}/lines`),
    enabled: !!estimateId,
  });
}

export function useAddEstimateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, ...data }: { estimateId: string } & Partial<EstimateLine>) =>
      apiFetch<EstimateLine>(`/api/estimates/${estimateId}/lines`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimateLines', variables.estimateId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', variables.estimateId] });
    },
  });
}

export function useBatchUpdateLines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, lines }: { estimateId: string; lines: Partial<EstimateLine>[] }) =>
      apiFetch<EstimateLine[]>(`/api/estimates/${estimateId}/lines`, {
        method: 'PUT',
        body: lines,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimateLines', variables.estimateId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', variables.estimateId] });
    },
  });
}

export function useDeleteEstimateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, lineId }: { estimateId: string; lineId: string }) =>
      apiFetch(`/api/estimates/${estimateId}/lines/${lineId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimateLines', variables.estimateId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', variables.estimateId] });
    },
  });
}

// --- Estimate Versions ---

export function useEstimateVersions(estimateId: string) {
  return useQuery({
    queryKey: ['estimateVersions', estimateId],
    queryFn: () => apiFetch<EstimateVersion[]>(`/api/estimates/${estimateId}/versions`),
    enabled: !!estimateId,
  });
}

export function useCreateEstimateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, reason }: { estimateId: string; reason?: string }) =>
      apiFetch<EstimateVersion>(`/api/estimates/${estimateId}/versions`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimateVersions', variables.estimateId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', variables.estimateId] });
    },
  });
}
