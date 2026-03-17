'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import type { PaginatedResponse } from './types';
import type { Opportunity } from './useOpportunities';

export interface Lead {
  id: string;
  company_name: string;
  domain: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  division_id: string | null;
  source_channel: string | null;
  utm_campaign: string | null;
  status: string;
  lead_score: number | null;
  fit_score: number | null;
  intent_score: number | null;
  engagement_score: number | null;
  is_qualified: boolean | null;
  current_sequence_id: string | null;
  automation_paused: boolean | null;
  notes: string | null;
  tags: string[] | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_touch_at: string | null;
  next_followup_at: string | null;
  deleted_at: string | null;
  enrichment_data: Record<string, unknown> | null;
  enrichment_status: string | null;
}

interface LeadFilters {
  divisionId?: string;
  status?: string;
  stage?: string; // deprecated, use status
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters ?? {}),
    queryFn: () =>
      apiFetch<PaginatedResponse<Lead>>('/api/crm/leads', {
        params: {
          division_id: filters?.divisionId,
          status: filters?.status || filters?.stage,
          assigned_to: filters?.assignedTo,
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

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => apiFetch<Lead>(`/api/crm/leads/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      apiFetch<Lead>('/api/crm/leads', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Lead> & { id: string }) =>
      apiFetch<Lead>(`/api/crm/leads/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useLeadStageTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: string; lost_reason?: string }) =>
      apiFetch<Lead>(`/api/crm/leads/${id}/stage`, { method: 'POST', body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      ...data
    }: {
      leadId: string;
      account_id?: string;
      contact_id?: string;
      opportunity_name?: string;
    }) => apiFetch<Opportunity>(`/api/crm/leads/${leadId}/convert`, { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useBulkEmail() {
  return useMutation({
    mutationFn: (data: {
      lead_ids: string[];
      subject: string;
      html: string;
      text?: string;
      template_id?: string;
    }) =>
      apiFetch<{ sent: number; failed: number; total: number }>('/api/crm/leads/bulk-email', {
        method: 'POST',
        body: data,
      }),
  });
}
