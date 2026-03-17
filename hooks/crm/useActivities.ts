'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TimelineEntry } from '@/app/api/crm/activities/timeline/route';
import { apiFetch } from '@/lib/api-client';

import type { PaginatedResponse } from './types';

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

interface MyTasksFilters {
  filter?: 'overdue' | 'today' | 'upcoming' | 'completed' | 'all';
  entityType?: 'lead' | 'opportunity' | 'account' | 'contact';
  limit?: number;
  offset?: number;
}

interface TimelineFilters {
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  limit?: number;
  offset?: number;
}

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
