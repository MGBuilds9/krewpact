'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface ChangeRequest {
  id: string;
  project_id: string;
  request_number: string;
  title: string;
  description: string;
  state: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'void';
  requested_by: string | null;
  estimated_cost_impact: number | null;
  estimated_days_impact: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeOrder {
  id: string;
  project_id: string;
  change_request_id: string | null;
  co_number: string;
  status: 'draft' | 'submitted' | 'client_review' | 'approved' | 'rejected' | 'void';
  reason: string | null;
  amount_delta: number | null;
  days_delta: number | null;
  approved_at: string | null;
  approved_by: string | null;
  signed_contract_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// Change Requests
// ============================================================

export function useChangeRequests(projectId: string) {
  return useQuery({
    queryKey: ['change-requests', projectId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ChangeRequest>>(`/api/projects/${projectId}/change-requests`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useChangeRequest(projectId: string, crId: string) {
  return useQuery({
    queryKey: ['change-request', projectId, crId],
    queryFn: () => apiFetch<ChangeRequest>(`/api/projects/${projectId}/change-requests/${crId}`),
    enabled: !!projectId && !!crId,
    staleTime: 30_000,
  });
}

export function useCreateChangeRequest(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChangeRequest>) =>
      apiFetch<ChangeRequest>(`/api/projects/${projectId}/change-requests`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests', projectId] });
    },
  });
}

export function useUpdateChangeRequest(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ crId, ...data }: Partial<ChangeRequest> & { crId: string }) =>
      apiFetch<ChangeRequest>(`/api/projects/${projectId}/change-requests/${crId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-requests', projectId] });
      queryClient.invalidateQueries({
        queryKey: ['change-request', projectId, variables.crId],
      });
    },
  });
}

// ============================================================
// Change Orders
// ============================================================

export function useChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ChangeOrder>>(`/api/projects/${projectId}/change-orders`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useChangeOrder(projectId: string, coId: string) {
  return useQuery({
    queryKey: ['change-order', projectId, coId],
    queryFn: () => apiFetch<ChangeOrder>(`/api/projects/${projectId}/change-orders/${coId}`),
    enabled: !!projectId && !!coId,
    staleTime: 30_000,
  });
}

export function useCreateChangeOrder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChangeOrder>) =>
      apiFetch<ChangeOrder>(`/api/projects/${projectId}/change-orders`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
    },
  });
}

export function useUpdateChangeOrder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coId, ...data }: Partial<ChangeOrder> & { coId: string }) =>
      apiFetch<ChangeOrder>(`/api/projects/${projectId}/change-orders/${coId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
      queryClient.invalidateQueries({
        queryKey: ['change-order', projectId, variables.coId],
      });
    },
  });
}
