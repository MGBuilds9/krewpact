'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface ScoringRule {
  id: string;
  name: string;
  field_name: string;
  operator: string;
  value: string;
  score_impact: number;
  category: string;
  is_active: boolean;
  division_id: string | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreHistory {
  id: string;
  lead_id: string;
  lead_score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
  triggered_by: string | null;
  recorded_at: string;
}

export interface RuleResultDisplay {
  rule_id: string;
  rule_name: string;
  category: string;
  score_impact: number;
  matched: boolean;
  field_name: string;
}

export interface ScoreBreakdown {
  score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
  rule_results: RuleResultDisplay[];
  history: ScoreHistory[];
}

export interface LeadAccountMatch {
  id: string;
  lead_id: string;
  account_id: string;
  match_type: string;
  match_score: number;
  is_confirmed: boolean;
  account?: {
    account_name: string;
    total_projects: number;
    last_project_date: string | null;
    lifetime_revenue: number;
  };
}

export function useScoringRules(divisionId?: string) {
  return useQuery({
    queryKey: ['scoring-rules', divisionId],
    queryFn: () =>
      apiFetchList<ScoringRule>('/api/crm/scoring-rules', {
        params: { division_id: divisionId },
      }),
  });
}

export function useCreateScoringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScoringRule>) =>
      apiFetch<ScoringRule>('/api/crm/scoring-rules', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
    },
  });
}

export function useUpdateScoringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ScoringRule> & { id: string }) =>
      apiFetch<ScoringRule>(`/api/crm/scoring-rules/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
    },
  });
}

export function useDeleteScoringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/scoring-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
    },
  });
}

export function useLeadScore(leadId: string) {
  return useQuery({
    queryKey: ['lead-score', leadId],
    queryFn: () =>
      apiFetch<{ score: number; history: ScoreHistory[] }>(`/api/crm/leads/${leadId}/score`),
    enabled: !!leadId,
  });
}

export function useLeadScoreBreakdown(leadId: string) {
  return useQuery({
    queryKey: ['lead-score-breakdown', leadId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/leads/${leadId}/score`);
      if (!res.ok) throw new Error('Failed to fetch score breakdown');
      return res.json() as Promise<ScoreBreakdown>;
    },
    enabled: !!leadId,
  });
}

export function useRecalculateLeadScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) =>
      apiFetch<{ score: number }>(`/api/crm/leads/${leadId}/score`, { method: 'POST' }),
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-score', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-score-breakdown', leadId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
    },
  });
}

export function useLeadAccountMatches(leadId: string) {
  return useQuery({
    queryKey: ['lead-account-matches', leadId],
    queryFn: () => apiFetchList<LeadAccountMatch>(`/api/crm/leads/${leadId}/matches`),
    enabled: !!leadId,
    staleTime: 60_000,
  });
}

export function useConfirmLeadAccountMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      match_id,
      is_confirmed,
    }: {
      leadId: string;
      match_id: string;
      is_confirmed: boolean;
    }) =>
      apiFetch<LeadAccountMatch>(`/api/crm/leads/${leadId}/matches`, {
        method: 'PATCH',
        body: { match_id, is_confirmed },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-account-matches', variables.leadId] });
    },
  });
}
