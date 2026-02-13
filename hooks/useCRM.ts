'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

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
  email: string | null;
  phone: string | null;
  role_title: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  lead_name: string;
  division_id: string | null;
  source: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  estimated_value: number | null;
  probability_pct: number | null;
  stage: string;
  assigned_to: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
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
  stages: Record<string, {
    opportunities: Opportunity[];
    total_value: number;
    count: number;
  }>;
}

// --- Filter interfaces ---

interface AccountFilters {
  divisionId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface ContactFilters {
  accountId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface LeadFilters {
  divisionId?: string;
  stage?: string;
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface OpportunityFilters {
  divisionId?: string;
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
}

interface PipelineFilters {
  divisionId?: string;
}

// --- Accounts ---

export function useAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: ['accounts', filters],
    queryFn: () =>
      apiFetch<Account[]>('/api/crm/accounts', {
        params: {
          division_id: filters?.divisionId,
          search: filters?.search,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
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
    mutationFn: (id: string) =>
      apiFetch(`/api/crm/accounts/${id}`, { method: 'DELETE' }),
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
      apiFetch<Contact[]>('/api/crm/contacts', {
        params: {
          account_id: filters?.accountId,
          search: filters?.search,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
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
    mutationFn: (id: string) =>
      apiFetch(`/api/crm/contacts/${id}`, { method: 'DELETE' }),
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
      apiFetch<Lead[]>('/api/crm/leads', {
        params: {
          division_id: filters?.divisionId,
          stage: filters?.stage,
          assigned_to: filters?.assignedTo,
          search: filters?.search,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
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
    mutationFn: (id: string) =>
      apiFetch(`/api/crm/leads/${id}`, { method: 'DELETE' }),
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

// --- Opportunities ---

export function useOpportunities(filters?: OpportunityFilters) {
  return useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () =>
      apiFetch<Opportunity[]>('/api/crm/opportunities', {
        params: {
          division_id: filters?.divisionId,
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
      apiFetch<Activity[]>('/api/crm/activities', {
        params: {
          opportunity_id: filters?.opportunityId,
          lead_id: filters?.leadId,
          account_id: filters?.accountId,
          contact_id: filters?.contactId,
          activity_type: filters?.activityType,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
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
