'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { DashboardMetrics } from '@/lib/crm/metrics';

// --- Paginated Response ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// --- Types ---

export interface Account {
  id: string;
  account_name: string;
  account_type: string;
  division_id: string | null;
  billing_address: Record<string, string> | null;
  shipping_address: Record<string, string> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  account_id: string | null;
  lead_id: string | null;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  domain: string | null;
  industry: string | null;
  company_size: string | null;
  revenue_range: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  division_id: string | null;
  source_channel: string | null;
  source_campaign: string | null;
  status: string;
  substatus: string | null;
  lead_score: number | null;
  fit_score: number | null;
  intent_score: number | null;
  engagement_score: number | null;
  is_qualified: boolean;
  in_sequence: boolean;
  notes: string | null;
  tags: string[] | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  deleted_at: string | null;
  enrichment_data: Record<string, unknown> | null;
  enrichment_status: string | null;
}

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

export interface Activity {
  id: string;
  activity_type: string;
  title: string;
  details: string | null;
  opportunity_id: string | null;
  lead_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  due_at: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
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

// --- Filter interfaces ---

interface AccountFilters {
  divisionId?: string;
  accountType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

interface ContactFilters {
  accountId?: string;
  leadId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
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

interface OpportunityFilters {
  divisionId?: string;
  accountId?: string;
  stage?: string;
  ownerUserId?: string;
  limit?: number;
  offset?: number;
}

interface ActivityFilters {
  opportunityId?: string;
  leadId?: string;
  accountId?: string;
  contactId?: string;
  activityType?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

interface PipelineFilters {
  divisionId?: string;
}

// --- Accounts ---

export function useAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: ['accounts', filters],
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
    queryKey: ['account', id],
    queryFn: () => apiFetch<Account>(`/api/crm/accounts/${id}`),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Account>) =>
      apiFetch<Account>('/api/crm/accounts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Account> & { id: string }) =>
      apiFetch<Account>(`/api/crm/accounts/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', variables.id] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// --- Contacts ---

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<Contact>>('/api/crm/contacts', {
        params: {
          account_id: filters?.accountId,
          lead_id: filters?.leadId,
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

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiFetch<Contact>(`/api/crm/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) =>
      apiFetch<Contact>('/api/crm/contacts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Contact> & { id: string }) =>
      apiFetch<Contact>(`/api/crm/contacts/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

// --- Leads ---

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
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
    queryKey: ['lead', id],
    queryFn: () => apiFetch<Lead>(`/api/crm/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      apiFetch<Lead>('/api/crm/leads', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Lead> & { id: string }) =>
      apiFetch<Lead>(`/api/crm/leads/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useLeadStageTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; stage: string; lost_reason?: string }) =>
      apiFetch<Lead>(`/api/crm/leads/${id}/stage`, { method: 'POST', body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

// --- Opportunities ---

export function useOpportunities(filters?: OpportunityFilters) {
  return useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () =>
      apiFetch<Opportunity[]>('/api/crm/opportunities', {
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
    queryKey: ['opportunity', id],
    queryFn: () => apiFetch<Opportunity>(`/api/crm/opportunities/${id}`),
    enabled: !!id,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Opportunity>) =>
      apiFetch<Opportunity>('/api/crm/opportunities', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
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
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.id] });
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

// --- Activities ---

export function useActivities(filters?: ActivityFilters) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<Activity>>('/api/crm/activities', {
        params: {
          opportunity_id: filters?.opportunityId,
          lead_id: filters?.leadId,
          account_id: filters?.accountId,
          contact_id: filters?.contactId,
          activity_type: filters?.activityType,
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

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Activity>) =>
      apiFetch<Activity>('/api/crm/activities', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// --- Sequences ---

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
      apiFetch<Sequence[]>('/api/crm/sequences', {
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
    queryFn: () => apiFetch<SequenceStep[]>(`/api/crm/sequences/${sequenceId}/steps`),
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
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useSequenceEnrollments(sequenceId: string, status?: string) {
  return useQuery({
    queryKey: ['sequence-enrollments', sequenceId, status],
    queryFn: () =>
      apiFetch<SequenceEnrollment[]>(`/api/crm/sequences/${sequenceId}/enrollments`, {
        params: { status },
      }),
    enabled: !!sequenceId,
  });
}

export function useOutreachHistory(leadId: string) {
  return useQuery({
    queryKey: ['outreach', leadId],
    queryFn: () =>
      apiFetch<OutreachEvent[]>('/api/crm/outreach', {
        params: { lead_id: leadId },
      }),
    enabled: !!leadId,
  });
}

// --- Lead Scoring ---

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
  score: number;
  previous_score: number | null;
  scored_at: string;
  rule_results: Record<string, unknown> | null;
}

export function useScoringRules(divisionId?: string) {
  return useQuery({
    queryKey: ['scoring-rules', divisionId],
    queryFn: () =>
      apiFetch<ScoringRule[]>('/api/crm/scoring-rules', {
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

export function useRecalculateLeadScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) =>
      apiFetch<{ score: number }>(`/api/crm/leads/${leadId}/score`, { method: 'POST' }),
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-score', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}

export function useAutoLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email_address: string;
      subject: string;
      direction: 'inbound' | 'outbound';
      message_preview?: string;
    }) =>
      apiFetch<{ matched: boolean; activities_created: number }>('/api/crm/activities/auto-log', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      to: { name?: string; address: string }[];
      subject: string;
      body: string;
      bodyType?: string;
      leadId?: string;
      contactId?: string;
      accountId?: string;
    }) => apiFetch<{ success: boolean }>('/api/email/send', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
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

// --- Opportunity Estimates ---

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

// --- Dashboard Metrics ---

export function useDashboardMetrics(divisionId?: string, period?: string) {
  return useQuery({
    queryKey: ['dashboard-metrics', divisionId, period],
    queryFn: () =>
      apiFetch<DashboardMetrics>('/api/crm/dashboard/metrics', {
        params: { division_id: divisionId, period },
      }),
  });
}

// --- Won/Lost ---

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
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
