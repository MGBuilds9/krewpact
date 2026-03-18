'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { DashboardMetrics } from '@/lib/crm/metrics';
import type {
  PipelineAgingEntry,
  RepPerformance,
  WinLossEntry,
} from '@/lib/crm/pipeline-intelligence';
import { queryKeys } from '@/lib/query-keys';

import type { PaginatedResponse } from './types';

export interface Opportunity {
  id: string;
  opportunity_name: string;
  lead_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  division_id: string | null;
  stage: string;
  target_close_date: string | null;
  estimated_revenue: number | null;
  probability_pct: number | null;
  owner_user_id: string | null;
  opportunity_stage_history?: StageHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface StageHistoryEntry {
  id: string;
  opportunity_id: string;
  from_stage: string;
  to_stage: string;
  changed_by: string | null;
  created_at: string;
}

export interface PipelineData {
  stages: Record<
    string,
    {
      opportunities: Opportunity[];
      total_value: number;
      count: number;
    }
  >;
}

export interface PipelineIntelligenceResponse {
  rep_performance: RepPerformance[];
  pipeline_aging: PipelineAgingEntry[];
  win_loss_by_rep: WinLossEntry[];
  win_loss_by_division: WinLossEntry[];
}

export interface DivisionComparisonResponse {
  division_comparison: Array<{
    division_id: string;
    total_opportunities: number;
    total_pipeline_value: number;
    won_count: number;
    won_revenue: number;
    lost_count: number;
    active_count: number;
    win_rate: number;
    avg_deal_size: number;
  }>;
  seasonal_analysis: Array<{
    quarter: string;
    created: number;
    won: number;
    lost: number;
    revenue: number;
  }>;
}

interface OpportunityFilters {
  divisionId?: string;
  accountId?: string;
  stage?: string;
  ownerUserId?: string;
  limit?: number;
  offset?: number;
}

interface PipelineFilters {
  divisionId?: string;
}

export function useOpportunities(filters?: OpportunityFilters) {
  return useQuery({
    queryKey: queryKeys.opportunities.list(filters ?? {}),
    staleTime: 30_000,
    queryFn: () =>
      apiFetch<PaginatedResponse<Opportunity>>('/api/crm/opportunities', {
        params: {
          division_id: filters?.divisionId,
          account_id: filters?.accountId,
          stage: filters?.stage,
          owner_user_id: filters?.ownerUserId,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: queryKeys.opportunities.detail(id),
    queryFn: () => apiFetch<Opportunity>(`/api/crm/opportunities/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Opportunity>) =>
      apiFetch<Opportunity>('/api/crm/opportunities', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Opportunity> & { id: string }) =>
      apiFetch<Opportunity>(`/api/crm/opportunities/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/opportunities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useOpportunityStageTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; stage: string; lost_reason?: string }) =>
      apiFetch<Opportunity>(`/api/crm/opportunities/${id}/stage`, { method: 'POST', body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function usePipeline(filters?: PipelineFilters) {
  return useQuery({
    queryKey: ['pipeline', filters],
    queryFn: () =>
      apiFetch<PipelineData>('/api/crm/opportunities', {
        params: {
          view: 'pipeline',
          division_id: filters?.divisionId,
        },
      }),
  });
}

export function useOpportunityEstimates(opportunityId: string) {
  return useQuery({
    queryKey: ['opportunity-estimates', opportunityId],
    queryFn: () =>
      apiFetch<{ id: string; estimate_number: string; total_amount: number; status: string }[]>(
        `/api/crm/opportunities/${opportunityId}/estimate`,
      ),
    enabled: !!opportunityId,
  });
}

export function useCreateLinkedEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ opportunityId, ...data }: { opportunityId: string; [key: string]: unknown }) =>
      apiFetch(`/api/crm/opportunities/${opportunityId}/estimate`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['opportunity-estimates', variables.opportunityId],
      });
    },
  });
}

export function useProposalData(opportunityId: string) {
  return useQuery({
    queryKey: ['proposal-data', opportunityId],
    queryFn: () =>
      apiFetch<import('@/lib/crm/proposal-generator').ProposalData>(
        `/api/crm/opportunities/${opportunityId}/proposal`,
      ),
    enabled: false, // only fetch on demand
  });
}

export function useDashboardMetrics(divisionId?: string, period?: string) {
  return useQuery({
    queryKey: ['dashboard-metrics', divisionId, period],
    queryFn: () =>
      apiFetch<DashboardMetrics>('/api/crm/dashboard/metrics', {
        params: { division_id: divisionId, period },
      }),
  });
}

export function useMarkOpportunityWon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      won_date?: string;
      won_notes?: string;
      sync_to_erp?: boolean;
    }) => apiFetch<Opportunity>(`/api/crm/opportunities/${id}/won`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useMarkOpportunityLost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      lost_reason: string;
      lost_notes?: string;
      competitor?: string;
      reopen_as_lead?: boolean;
    }) =>
      apiFetch<Opportunity>(`/api/crm/opportunities/${id}/lost`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function usePipelineIntelligence(divisionId?: string) {
  return useQuery({
    queryKey: ['pipeline-intelligence', divisionId],
    queryFn: () =>
      apiFetch<PipelineIntelligenceResponse>('/api/crm/dashboard/intelligence', {
        params: { division_id: divisionId },
      }),
    staleTime: 60_000,
  });
}

export function useDivisionComparison() {
  return useQuery({
    queryKey: ['division-comparison'],
    queryFn: () => apiFetch<DivisionComparisonResponse>('/api/crm/dashboard/division-comparison'),
    staleTime: 60_000,
  });
}
