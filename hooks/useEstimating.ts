'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// --- Paginated Response ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// --- Types ---

export interface CostCatalogItem {
  id: string;
  division_id: string | null;
  item_code: string | null;
  item_name: string;
  item_type: string;
  unit: string;
  base_cost: number;
  vendor_name: string | null;
  effective_from: string;
  effective_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Assembly {
  id: string;
  division_id: string | null;
  assembly_code: string | null;
  assembly_name: string;
  description: string | null;
  unit: string;
  version_no: number;
  is_active: boolean;
  created_by: string | null;
  assembly_items?: AssemblyItem[];
  created_at: string;
  updated_at: string;
}

export interface AssemblyItem {
  id: string;
  assembly_id: string;
  catalog_item_id: string | null;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EstimateTemplate {
  id: string;
  division_id: string | null;
  template_name: string;
  project_type: string | null;
  payload: Record<string, unknown>;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateAlternate {
  id: string;
  estimate_id: string;
  title: string;
  description: string | null;
  amount: number;
  selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstimateAllowance {
  id: string;
  estimate_id: string;
  allowance_name: string;
  allowance_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Filter interfaces ---

interface CostCatalogFilters {
  divisionId?: string;
  itemType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

interface AssemblyFilters {
  divisionId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

interface EstimateTemplateFilters {
  divisionId?: string;
  projectType?: string;
  limit?: number;
  offset?: number;
}

// --- Cost Catalog Items ---

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
    mutationFn: (id: string) =>
      apiFetch(`/api/cost-catalog/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-catalog-items'] });
    },
  });
}

// --- Assemblies ---

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
    mutationFn: (id: string) =>
      apiFetch(`/api/assemblies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
    },
  });
}

// --- Assembly Items ---

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
    mutationFn: ({ assemblyId, itemId, ...data }: Partial<AssemblyItem> & { assemblyId: string; itemId: string }) =>
      apiFetch<AssemblyItem>(`/api/assemblies/${assemblyId}/items/${itemId}`, { method: 'PATCH', body: data }),
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

// --- Estimate Templates ---

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
    mutationFn: (id: string) =>
      apiFetch(`/api/estimate-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
    },
  });
}

// --- Estimate Alternates ---

export function useEstimateAlternates(estimateId: string) {
  return useQuery({
    queryKey: ['estimate-alternates', estimateId],
    queryFn: () => apiFetch<EstimateAlternate[]>(`/api/estimates/${estimateId}/alternates`),
    enabled: !!estimateId,
  });
}

export function useCreateEstimateAlternate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, ...data }: Partial<EstimateAlternate> & { estimateId: string }) =>
      apiFetch<EstimateAlternate>(`/api/estimates/${estimateId}/alternates`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-alternates', variables.estimateId] });
    },
  });
}

export function useUpdateEstimateAlternate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, alternateId, ...data }: Partial<EstimateAlternate> & { estimateId: string; alternateId: string }) =>
      apiFetch<EstimateAlternate>(`/api/estimates/${estimateId}/alternates/${alternateId}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-alternates', variables.estimateId] });
    },
  });
}

export function useDeleteEstimateAlternate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, alternateId }: { estimateId: string; alternateId: string }) =>
      apiFetch(`/api/estimates/${estimateId}/alternates/${alternateId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-alternates', variables.estimateId] });
    },
  });
}

// --- Estimate Allowances ---

export function useEstimateAllowances(estimateId: string) {
  return useQuery({
    queryKey: ['estimate-allowances', estimateId],
    queryFn: () => apiFetch<EstimateAllowance[]>(`/api/estimates/${estimateId}/allowances`),
    enabled: !!estimateId,
  });
}

export function useCreateEstimateAllowance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, ...data }: Partial<EstimateAllowance> & { estimateId: string }) =>
      apiFetch<EstimateAllowance>(`/api/estimates/${estimateId}/allowances`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-allowances', variables.estimateId] });
    },
  });
}

export function useUpdateEstimateAllowance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, allowanceId, ...data }: Partial<EstimateAllowance> & { estimateId: string; allowanceId: string }) =>
      apiFetch<EstimateAllowance>(`/api/estimates/${estimateId}/allowances/${allowanceId}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-allowances', variables.estimateId] });
    },
  });
}

export function useDeleteEstimateAllowance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, allowanceId }: { estimateId: string; allowanceId: string }) =>
      apiFetch(`/api/estimates/${estimateId}/allowances/${allowanceId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-allowances', variables.estimateId] });
    },
  });
}
