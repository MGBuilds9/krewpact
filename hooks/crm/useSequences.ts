'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface Sequence {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: Record<string, unknown> | null;
  is_active: boolean;
  division_id: string | null;
  sequence_steps?: SequenceStep[];
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  action_type: string;
  action_config: Record<string, unknown>;
  delay_days: number;
  delay_hours: number;
  created_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  lead_id: string;
  contact_id: string | null;
  current_step: number;
  status: string;
  enrolled_at: string;
  next_step_at: string | null;
}

export interface OutreachEvent {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  channel: string;
  direction: string;
  activity_type: string | null;
  outcome: string | null;
  outcome_detail: string | null;
  subject: string | null;
  message_preview: string | null;
  notes: string | null;
  sequence_id: string | null;
  sequence_step: number | null;
  is_automated: boolean;
  occurred_at: string;
  created_by: string | null;
}

interface SequenceFilters {
  divisionId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export function useSequences(filters?: SequenceFilters) {
  return useQuery({
    queryKey: ['sequences', filters],
    queryFn: () =>
      apiFetchList<Sequence>('/api/crm/sequences', {
        params: {
          division_id: filters?.divisionId,
          is_active: filters?.isActive,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
  });
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: ['sequence', id],
    queryFn: () => apiFetch<Sequence>(`/api/crm/sequences/${id}`),
    enabled: !!id,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Sequence>) =>
      apiFetch<Sequence>('/api/crm/sequences', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Sequence> & { id: string }) =>
      apiFetch<Sequence>(`/api/crm/sequences/${id}`, { method: 'PUT', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      queryClient.invalidateQueries({ queryKey: ['sequence', variables.id] });
    },
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/sequences/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });
}

export function useSequenceSteps(sequenceId: string) {
  return useQuery({
    queryKey: ['sequence-steps', sequenceId],
    queryFn: () => apiFetchList<SequenceStep>(`/api/crm/sequences/${sequenceId}/steps`),
    enabled: !!sequenceId,
  });
}

export function useCreateSequenceStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, ...data }: Partial<SequenceStep> & { sequenceId: string }) =>
      apiFetch<SequenceStep>(`/api/crm/sequences/${sequenceId}/steps`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: ['sequence', variables.sequenceId] });
    },
  });
}

export function useDeleteSequenceStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, stepId }: { sequenceId: string; stepId: string }) =>
      apiFetch(`/api/crm/sequences/${sequenceId}/steps/${stepId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: ['sequence', variables.sequenceId] });
    },
  });
}

export function useEnrollInSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      ...data
    }: {
      sequenceId: string;
      lead_id: string;
      contact_id?: string;
    }) =>
      apiFetch<SequenceEnrollment>(`/api/crm/sequences/${sequenceId}/enroll`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-enrollments', variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useBulkEnrollInSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, leadIds }: { sequenceId: string; leadIds: string[] }) =>
      apiFetch<{ enrolled: number; skipped: number; errors: string[] }>(
        '/api/crm/sequences/enrollments',
        {
          method: 'POST',
          body: { sequence_id: sequenceId, lead_ids: leadIds },
        },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sequence-enrollments', variables.sequenceId],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useSequenceEnrollments(sequenceId: string, status?: string) {
  return useQuery({
    queryKey: ['sequence-enrollments', sequenceId, status],
    queryFn: () =>
      apiFetchList<SequenceEnrollment>(`/api/crm/sequences/${sequenceId}/enrollments`, {
        params: { status },
      }),
    enabled: !!sequenceId,
  });
}

export function useProcessSequences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ processed: number; completed: number; errors: string[] }>(
        '/api/crm/sequences/process',
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] });
    },
  });
}

export function useSequenceAnalytics(divisionId?: string) {
  return useQuery({
    queryKey: ['sequence-analytics', divisionId],
    queryFn: () =>
      apiFetch<{
        data: Array<{
          sequence_id: string;
          sequence_name: string;
          is_active: boolean;
          total_steps: number;
          enrollments: {
            active: number;
            completed: number;
            paused: number;
            failed: number;
            total: number;
          };
        }>;
      }>('/api/crm/sequences/analytics', {
        params: { divisionId },
      }),
  });
}

export function useOutreachHistory(leadId: string) {
  return useQuery({
    queryKey: ['outreach', leadId],
    queryFn: () =>
      apiFetchList<OutreachEvent>('/api/crm/outreach', {
        params: { lead_id: leadId },
      }),
    enabled: !!leadId,
  });
}

export function useCreateOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OutreachEvent>) =>
      apiFetch<OutreachEvent>('/api/crm/outreach', { method: 'POST', body: data }),
    onSuccess: (_, variables) => {
      if (variables.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['outreach', variables.lead_id] });
      }
    },
  });
}
