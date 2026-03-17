'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { AccountHealthScore, LifecycleStage } from '@/lib/crm/account-health';
import { queryKeys } from '@/lib/query-keys';

import type { PaginatedResponse } from './types';

export interface Account {
  id: string;
  account_name: string;
  account_type: string;
  division_id: string | null;
  billing_address: Record<string, string> | null;
  shipping_address: Record<string, string> | null;
  notes: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: Record<string, string> | null;
  company_code: string | null;
  source: string | null;
  total_projects: number;
  lifetime_revenue: number;
  first_project_date: string | null;
  last_project_date: string | null;
  is_repeat_client: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountFilters {
  divisionId?: string;
  accountType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AccountHealthResponse {
  account_id: string;
  account_name: string;
  health: AccountHealthScore;
  lifecycle_stage: LifecycleStage;
  stats: {
    total_opportunities: number;
    won_opportunities: number;
    active_opportunities: number;
    total_revenue: number;
    last_activity_at: string | null;
  };
}

export interface AccountRevenueResponse {
  account_id: string;
  account_name: string;
  lifetime_value: number;
  total_won_deals: number;
  revenue_by_year: Record<string, number>;
  project_count: number;
  recent_deals: { id: string; name: string; revenue: number | null; closed_at: string }[];
}

export interface ProjectHistory {
  id: string;
  account_id: string;
  project_number: string | null;
  project_name: string;
  project_description: string | null;
  project_address: Record<string, string> | null;
  start_date: string | null;
  end_date: string | null;
  estimated_value: number | null;
  outcome: string;
  source: string;
  created_at: string;
}

export function useAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: queryKeys.accounts.list(filters ?? {}),
    queryFn: () =>
      apiFetch<PaginatedResponse<Account>>('/api/crm/accounts', {
        params: {
          division_id: filters?.divisionId,
          account_type: filters?.accountType,
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

export function useAccount(id: string) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: () => apiFetch<Account>(`/api/crm/accounts/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Account>) =>
      apiFetch<Account>('/api/crm/accounts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<Account>(`/api/crm/accounts/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(variables.id) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

export function useAccountHealth(accountId: string) {
  return useQuery({
    queryKey: ['account-health', accountId],
    queryFn: () => apiFetch<AccountHealthResponse>(`/api/crm/accounts/${accountId}/health`),
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

export function useAccountRevenue(accountId: string) {
  return useQuery({
    queryKey: ['account-revenue', accountId],
    queryFn: () => apiFetch<AccountRevenueResponse>(`/api/crm/accounts/${accountId}/revenue`),
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

export function useAccountProjects(accountId: string) {
  return useQuery({
    queryKey: ['account-projects', accountId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ProjectHistory>>(`/api/crm/accounts/${accountId}/projects`),
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

export function useMergeAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { primary_id: string; secondary_id: string }) =>
      apiFetch<{
        primaryId: string;
        secondaryId: string;
        mergedFields: string[];
        reassignedRelations: string[];
      }>('/api/crm/accounts/merge', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
