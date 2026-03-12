'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { DashboardMetrics } from '@/lib/crm/metrics';
import type { AccountHealthScore, LifecycleStage } from '@/lib/crm/account-health';
import type {
  RepPerformance,
  PipelineAgingEntry,
  WinLossEntry,
} from '@/lib/crm/pipeline-intelligence';
import type { TimelineEntry } from '@/app/api/crm/activities/timeline/route';

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

// --- Contacts ---

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters ?? {}),
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
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => apiFetch<Contact>(`/api/crm/contacts/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) =>
      apiFetch<Contact>('/api/crm/contacts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Contact> & { id: string }) =>
      apiFetch<Contact>(`/api/crm/contacts/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(variables.id) });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/crm/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

// --- Leads ---

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

// --- Opportunities ---

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
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
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
  lead_score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
  triggered_by: string | null;
  recorded_at: string;
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

// --- Lead-Account Matches ---

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

export function useLeadAccountMatches(leadId: string) {
  return useQuery({
    queryKey: ['lead-account-matches', leadId],
    queryFn: () => apiFetch<LeadAccountMatch[]>(`/api/crm/leads/${leadId}/matches`),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

// --- My Tasks / Follow-ups ---

interface MyTasksFilters {
  filter?: 'overdue' | 'today' | 'upcoming' | 'completed' | 'all';
  entityType?: 'lead' | 'opportunity' | 'account' | 'contact';
  limit?: number;
  offset?: number;
}

export function useMyTasks(filters?: MyTasksFilters) {
  return useQuery({
    queryKey: ['my-tasks', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<Activity>>('/api/crm/activities/my-tasks', {
        params: {
          filter: filters?.filter,
          entity_type: filters?.entityType,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    staleTime: 15_000,
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: ['overdue-tasks'],
    queryFn: () => apiFetch<{ data: Activity[]; count: number }>('/api/crm/activities/overdue'),
    staleTime: 30_000,
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<Activity>(`/api/crm/activities/${id}`, {
        method: 'PATCH',
        body: { completed_at: new Date().toISOString() },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// --- Unified Timeline ---

interface TimelineFilters {
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  limit?: number;
  offset?: number;
}

export function useTimeline(filters: TimelineFilters) {
  return useQuery({
    queryKey: ['timeline', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<TimelineEntry>>('/api/crm/activities/timeline', {
        params: {
          lead_id: filters.leadId,
          account_id: filters.accountId,
          contact_id: filters.contactId,
          opportunity_id: filters.opportunityId,
          limit: filters.limit,
          offset: filters.offset,
        },
      }),
    enabled: !!(filters.leadId || filters.accountId || filters.contactId || filters.opportunityId),
    staleTime: 30_000,
  });
}

// --- Account Health & Revenue ---

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

// --- Pipeline Intelligence ---

export interface PipelineIntelligenceResponse {
  rep_performance: RepPerformance[];
  pipeline_aging: PipelineAgingEntry[];
  win_loss_by_rep: WinLossEntry[];
  win_loss_by_division: WinLossEntry[];
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

export function useDivisionComparison() {
  return useQuery({
    queryKey: ['division-comparison'],
    queryFn: () => apiFetch<DivisionComparisonResponse>('/api/crm/dashboard/division-comparison'),
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

export function useMergeContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { primary_id: string; secondary_id: string }) =>
      apiFetch<{
        primaryId: string;
        secondaryId: string;
        mergedFields: string[];
        reassignedRelations: string[];
      }>('/api/crm/contacts/merge', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
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

// --- Bidding Opportunities ---

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

// --- Enrichment ---

export interface EnrichmentJob {
  id: string;
  lead_id: string;
  status: string;
  source: string;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  lastRunAt: string | null;
}

export interface EnrichmentConfig {
  sources: Array<{ name: string; enabled: boolean; order: number }>;
}

export function useEnrichmentJobs(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ['enrichment-jobs', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<EnrichmentJob>>(`/api/crm/enrichment?${searchParams.toString()}`),
  });
}

export function useEnrichmentStats() {
  return useQuery({
    queryKey: ['enrichment-stats'],
    queryFn: () => apiFetch<EnrichmentStats>('/api/crm/enrichment/stats'),
    staleTime: 30_000,
  });
}

export function useEnrichmentConfig() {
  return useQuery({
    queryKey: ['enrichment-config'],
    queryFn: () => apiFetch<EnrichmentConfig>('/api/crm/enrichment/config'),
  });
}

export function useRetryEnrichment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<EnrichmentJob>(`/api/crm/enrichment/${id}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrichment-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
    },
  });
}

export function useUpdateEnrichmentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnrichmentConfig) =>
      apiFetch<EnrichmentConfig>('/api/crm/enrichment/config', { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrichment-config'] });
    },
  });
}

// --- CRM Settings ---

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

// --- Project History ---

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

export function useAccountProjects(accountId: string) {
  return useQuery({
    queryKey: ['account-projects', accountId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ProjectHistory>>(`/api/crm/accounts/${accountId}/projects`),
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

// --- ICP ---

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
      apiFetch<{ message: string; leads_processed: number; icps_evaluated: number; pairs_upserted: number }>(
        '/api/crm/icp/match',
        { method: 'POST', body: body ?? {} },
      ),
  });
}
