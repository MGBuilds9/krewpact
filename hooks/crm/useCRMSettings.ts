'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import type { PaginatedResponse } from './types';

export interface SLASettings {
  lead_stages: Array<{ stage: string; maxHours: number }>;
  opportunity_stages: Array<{ stage: string; maxHours: number }>;
}

export interface SequenceDefaults {
  max_enrollments_per_day: number;
  send_window_start: string;
  send_window_end: string;
  throttle_per_hour: number;
  auto_unenroll_on_reply: boolean;
}

export interface BiddingOpportunity {
  id: string;
  org_id: string;
  division_id: string | null;
  title: string;
  source: 'merx' | 'bids_tenders' | 'manual' | 'referral';
  url: string | null;
  deadline: string | null;
  estimated_value: number | null;
  status: 'new' | 'reviewing' | 'bidding' | 'submitted' | 'won' | 'lost' | 'expired';
  assigned_to: string | null;
  opportunity_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICP {
  id: string;
  division_id: string | null;
  name: string;
  description: string | null;
  is_auto_generated: boolean;
  is_active: boolean;
  industry_match: string[];
  geography_match: { cities: string[]; provinces: string[] } | null;
  project_value_range: { min: number; max: number } | null;
  project_types: string[];
  repeat_rate_weight: number;
  sample_size: number;
  confidence_score: number;
  avg_deal_value: number | null;
  avg_project_duration_days: number | null;
  top_sources: string[];
  created_at: string;
  updated_at: string;
}

interface ICPFilters {
  divisionId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export function useSLASettings() {
  return useQuery({
    queryKey: ['crm-settings', 'sla'],
    queryFn: () => apiFetch<SLASettings>('/api/crm/settings/sla'),
  });
}

export function useUpdateSLASettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SLASettings) =>
      apiFetch<SLASettings>('/api/crm/settings/sla', { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-settings', 'sla'] });
    },
  });
}

export function useSequenceDefaults() {
  return useQuery({
    queryKey: ['crm-settings', 'sequences'],
    queryFn: () => apiFetch<SequenceDefaults>('/api/crm/settings/sequences'),
  });
}

export function useUpdateSequenceDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SequenceDefaults) =>
      apiFetch<SequenceDefaults>('/api/crm/settings/sequences', { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-settings', 'sequences'] });
    },
  });
}

export function useBiddingOpportunities(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ['bidding', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<BiddingOpportunity>>(
        `/api/crm/bidding?${searchParams.toString()}`,
      ),
  });
}

export function useBiddingOpportunity(id: string) {
  return useQuery({
    queryKey: ['bidding', id],
    queryFn: () => apiFetch<BiddingOpportunity>(`/api/crm/bidding/${id}`),
    enabled: !!id,
  });
}

export function useCreateBidding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BiddingOpportunity>) =>
      apiFetch<BiddingOpportunity>('/api/crm/bidding', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bidding'] });
    },
  });
}

export function useUpdateBidding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<BiddingOpportunity>) =>
      apiFetch<BiddingOpportunity>(`/api/crm/bidding/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bidding'] });
      queryClient.invalidateQueries({ queryKey: ['bidding', variables.id] });
    },
  });
}

export function useDeleteBidding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/crm/bidding/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bidding'] });
    },
  });
}

export function useLinkBiddingToOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opportunity_id }: { id: string; opportunity_id: string }) =>
      apiFetch<BiddingOpportunity>(`/api/crm/bidding/${id}/link`, {
        method: 'POST',
        body: { opportunity_id },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bidding'] });
      queryClient.invalidateQueries({ queryKey: ['bidding', variables.id] });
    },
  });
}

export function useImportBidding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      items: Array<{
        title: string;
        source?: string;
        url?: string;
        deadline?: string;
        estimated_value?: number;
        notes?: string;
      }>;
    }) =>
      apiFetch<{ imported: number; items: BiddingOpportunity[] }>('/api/crm/bidding/import', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bidding'] });
    },
  });
}

export function useICPs(filters?: ICPFilters) {
  return useQuery({
    queryKey: queryKeys.icps.list(filters ?? {}),
    queryFn: () =>
      apiFetch<PaginatedResponse<ICP>>('/api/crm/icp', {
        params: {
          division_id: filters?.divisionId,
          is_active: filters?.isActive,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function useICP(id: string) {
  return useQuery({
    queryKey: queryKeys.icps.detail(id),
    queryFn: () => apiFetch<ICP>(`/api/crm/icp/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useGenerateICPs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_: void) =>
      apiFetch<{ message: string; generated: number; deleted: number; icps: ICP[] }>(
        '/api/crm/icp/generate',
        { method: 'POST', body: {} },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.icps.all });
    },
  });
}

export function useMatchLeadsToICPs() {
  return useMutation({
    mutationFn: (body?: { limit?: number }) =>
      apiFetch<{
        message: string;
        leads_processed: number;
        icps_evaluated: number;
        pairs_upserted: number;
      }>('/api/crm/icp/match', { method: 'POST', body: body ?? {} }),
  });
}
