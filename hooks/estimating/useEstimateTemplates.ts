'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

import type { EstimateTemplate, EstimateTemplateFilters, PaginatedResponse } from './types';

export function useEstimateTemplates(filters?: EstimateTemplateFilters) {
  return useQuery({
    queryKey: ['estimate-templates', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<EstimateTemplate>>('/api/estimate-templates', {
        params: {
          division_id: filters?.divisionId,
          project_type: filters?.projectType,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useEstimateTemplate(id: string) {
  return useQuery({
    queryKey: ['estimate-template', id],
    queryFn: () => apiFetch<EstimateTemplate>(`/api/estimate-templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateEstimateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EstimateTemplate>) =>
      apiFetch<EstimateTemplate>('/api/estimate-templates', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
    },
  });
}

export function useUpdateEstimateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<EstimateTemplate> & { id: string }) =>
      apiFetch<EstimateTemplate>(`/api/estimate-templates/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
      queryClient.invalidateQueries({ queryKey: ['estimate-template', variables.id] });
    },
  });
}

export function useDeleteEstimateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/estimate-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
    },
  });
}
