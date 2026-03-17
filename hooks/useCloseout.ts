'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface CloseoutPackage {
  id: string;
  project_id: string;
  status: 'draft' | 'in_review' | 'client_review' | 'accepted' | 'rejected';
  checklist_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DeficiencyItem {
  id: string;
  project_id: string;
  title: string;
  details: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  assigned_to: string | null;
  due_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarrantyItem {
  id: string;
  project_id: string;
  title: string;
  deficiency_id: string | null;
  provider_name: string | null;
  warranty_start: string;
  warranty_end: string;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCall {
  id: string;
  project_id: string;
  call_number: string;
  title: string;
  description: string | null;
  status: 'open' | 'scheduled' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  warranty_item_id: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCallEvent {
  id: string;
  service_call_id: string;
  event_type: string;
  event_payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// Closeout packages
export function useCloseoutPackages(projectId: string) {
  return useQuery({
    queryKey: ['closeout-packages', projectId],
    queryFn: () =>
      apiFetch<PaginatedResponse<CloseoutPackage>>(`/api/projects/${projectId}/closeout`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateCloseoutPackage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<CloseoutPackage>(`/api/projects/${projectId}/closeout`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closeout-packages', projectId] });
    },
  });
}

export function useUpdateCloseoutPackage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pkgId, ...data }: { pkgId: string } & Record<string, unknown>) =>
      apiFetch<CloseoutPackage>(`/api/projects/${projectId}/closeout/${pkgId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closeout-packages', projectId] });
    },
  });
}

// Deficiencies
export function useDeficiencies(projectId: string) {
  return useQuery({
    queryKey: ['deficiencies', projectId],
    queryFn: () =>
      apiFetch<PaginatedResponse<DeficiencyItem>>(`/api/projects/${projectId}/deficiencies`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateDeficiency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<DeficiencyItem>(`/api/projects/${projectId}/deficiencies`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deficiencies', projectId] });
    },
  });
}

export function useUpdateDeficiency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ defId, ...data }: { defId: string } & Record<string, unknown>) =>
      apiFetch<DeficiencyItem>(`/api/projects/${projectId}/deficiencies/${defId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deficiencies', projectId] });
    },
  });
}

// Warranty items
export function useWarrantyItems(projectId: string) {
  return useQuery({
    queryKey: ['warranty-items', projectId],
    queryFn: () => apiFetch<PaginatedResponse<WarrantyItem>>(`/api/projects/${projectId}/warranty`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateWarrantyItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<WarrantyItem>(`/api/projects/${projectId}/warranty`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-items', projectId] });
    },
  });
}

// Service calls
export function useServiceCalls(projectId: string) {
  return useQuery({
    queryKey: ['service-calls', projectId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ServiceCall>>(`/api/projects/${projectId}/service-calls`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateServiceCall(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ServiceCall>(`/api/projects/${projectId}/service-calls`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls', projectId] });
    },
  });
}

export function useUpdateServiceCall(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, ...data }: { callId: string } & Record<string, unknown>) =>
      apiFetch<ServiceCall>(`/api/projects/${projectId}/service-calls/${callId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls', projectId] });
    },
  });
}

export function useAddServiceCallEvent(projectId: string, callId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ServiceCallEvent>(`/api/projects/${projectId}/service-calls/${callId}/events`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls', projectId] });
    },
  });
}
