'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

import type { CostCatalogFilters, CostCatalogItem, PaginatedResponse } from './types';

export function useCostCatalogItems(filters?: CostCatalogFilters) {
  return useQuery({
    queryKey: ['cost-catalog-items', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<CostCatalogItem>>('/api/cost-catalog', {
        params: {
          division_id: filters?.divisionId,
          item_type: filters?.itemType,
          search: filters?.search,
          limit: filters?.limit,
          offset: filters?.offset,
          sort_by: filters?.sortBy,
          sort_dir: filters?.sortDir,
        },
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useCostCatalogItem(id: string) {
  return useQuery({
    queryKey: ['cost-catalog-item', id],
    queryFn: () => apiFetch<CostCatalogItem>(`/api/cost-catalog/${id}`),
    enabled: !!id,
  });
}

export function useCreateCostCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CostCatalogItem>) =>
      apiFetch<CostCatalogItem>('/api/cost-catalog', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-catalog-items'] });
    },
  });
}

export function useUpdateCostCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CostCatalogItem> & { id: string }) =>
      apiFetch<CostCatalogItem>(`/api/cost-catalog/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cost-catalog-items'] });
      queryClient.invalidateQueries({ queryKey: ['cost-catalog-item', variables.id] });
    },
  });
}

export function useDeleteCostCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/cost-catalog/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-catalog-items'] });
    },
  });
}
