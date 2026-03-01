'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface ReferenceDataSet {
  id: string;
  set_key: string;
  set_name: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ReferenceDataValue {
  id: string;
  data_set_id: string;
  value_key: string;
  value_name: string;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacyRequest {
  id: string;
  requester_email: string;
  requester_name: string | null;
  request_type: 'access' | 'correction' | 'deletion' | 'export';
  status: 'received' | 'verified' | 'in_progress' | 'completed' | 'rejected';
  legal_basis: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BCPIncident {
  id: string;
  incident_number: string;
  severity: 'sev1' | 'sev2' | 'sev3' | 'sev4';
  title: string;
  summary: string | null;
  status: 'open' | 'mitigating' | 'monitoring' | 'resolved' | 'closed';
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// Reference data sets
export function useReferenceDataSets() {
  return useQuery({
    queryKey: ['reference-data-sets'],
    queryFn: () => apiFetch<PaginatedResponse<ReferenceDataSet>>('/api/governance/reference-data'),
    staleTime: 30_000,
  });
}

export function useCreateReferenceDataSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ReferenceDataSet>('/api/governance/reference-data', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data-sets'] });
    },
  });
}

export function useReferenceDataValues(setId: string) {
  return useQuery({
    queryKey: ['reference-data-values', setId],
    queryFn: () => apiFetch<PaginatedResponse<ReferenceDataValue>>(`/api/governance/reference-data/${setId}/values`),
    enabled: !!setId,
    staleTime: 30_000,
  });
}

export function useAddReferenceDataValue(setId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ReferenceDataValue>(`/api/governance/reference-data/${setId}/values`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data-values', setId] });
    },
  });
}

// Privacy requests
export function usePrivacyRequests(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['privacy-requests', params],
    queryFn: () => apiFetch<PaginatedResponse<PrivacyRequest>>('/api/privacy/requests', { params }),
    staleTime: 30_000,
  });
}

export function useCreatePrivacyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<PrivacyRequest>('/api/privacy/requests', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-requests'] });
    },
  });
}

export function useUpdatePrivacyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<PrivacyRequest>(`/api/privacy/requests/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-requests'] });
    },
  });
}

// BCP incidents
export function useBCPIncidents(params?: { status?: string; severity?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['bcp-incidents', params],
    queryFn: () => apiFetch<PaginatedResponse<BCPIncident>>('/api/bcp/incidents', { params }),
    staleTime: 30_000,
  });
}

export function useCreateBCPIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<BCPIncident>('/api/bcp/incidents', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcp-incidents'] });
    },
  });
}

export function useUpdateBCPIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<BCPIncident>(`/api/bcp/incidents/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcp-incidents'] });
    },
  });
}
