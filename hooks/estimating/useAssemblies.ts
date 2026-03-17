'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

import type { Assembly, AssemblyFilters, AssemblyItem, PaginatedResponse } from './types';

export function useAssemblies(filters?: AssemblyFilters) {
  return useQuery({
    queryKey: ['assemblies', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<Assembly>>('/api/assemblies', {
        params: {
          division_id: filters?.divisionId,
          is_active: filters?.isActive,
          search: filters?.search,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useAssembly(id: string) {
  return useQuery({
    queryKey: ['assembly', id],
    queryFn: () => apiFetch<Assembly>(`/api/assemblies/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssembly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Assembly>) =>
      apiFetch<Assembly>('/api/assemblies', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
    },
  });
}

export function useUpdateAssembly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Assembly> & { id: string }) =>
      apiFetch<Assembly>(`/api/assemblies/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      queryClient.invalidateQueries({ queryKey: ['assembly', variables.id] });
    },
  });
}

export function useDeleteAssembly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/assemblies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
    },
  });
}

export function useAssemblyItems(assemblyId: string) {
  return useQuery({
    queryKey: ['assembly-items', assemblyId],
    queryFn: () => apiFetch<AssemblyItem[]>(`/api/assemblies/${assemblyId}/items`),
    enabled: !!assemblyId,
  });
}

export function useCreateAssemblyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assemblyId, ...data }: Partial<AssemblyItem> & { assemblyId: string }) =>
      apiFetch<AssemblyItem>(`/api/assemblies/${assemblyId}/items`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assembly-items', variables.assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assembly', variables.assemblyId] });
    },
  });
}

export function useUpdateAssemblyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assemblyId,
      itemId,
      ...data
    }: Partial<AssemblyItem> & { assemblyId: string; itemId: string }) =>
      apiFetch<AssemblyItem>(`/api/assemblies/${assemblyId}/items/${itemId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assembly-items', variables.assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assembly', variables.assemblyId] });
    },
  });
}

export function useDeleteAssemblyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assemblyId, itemId }: { assemblyId: string; itemId: string }) =>
      apiFetch(`/api/assemblies/${assemblyId}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assembly-items', variables.assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assembly', variables.assemblyId] });
    },
  });
}
