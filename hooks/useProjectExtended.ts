'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

import type { PaginatedResponse } from './useEstimating';

// --- Types ---

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  created_at: string;
}

export interface SiteDiaryEntry {
  id: string;
  project_id: string;
  entry_at: string;
  entry_type:
    | 'observation'
    | 'visitor'
    | 'delivery'
    | 'weather'
    | 'safety'
    | 'progress'
    | 'other'
    | 'meeting';
  entry_text: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  weather: Record<string, unknown> | null;
  crew_count: number | null;
  work_summary: string | null;
  delays: string | null;
  safety_notes: string | null;
  is_offline_origin: boolean;
  author_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Task Dependencies ---

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: () => apiFetch<TaskDependency[]>(`/api/tasks/${taskId}/dependencies`),
    enabled: !!taskId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateTaskDependency(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { depends_on_task_id: string; dependency_type?: string }) =>
      apiFetch<TaskDependency>(`/api/tasks/${taskId}/dependencies`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
    },
  });
}

export function useDeleteTaskDependency(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dependencyId: string) =>
      apiFetch(`/api/tasks/${taskId}/dependencies?dependency_id=${dependencyId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
    },
  });
}

// --- Site Diary ---

export function useSiteDiary(
  projectId: string,
  filters?: { entry_type?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: ['site-diary', projectId, filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<SiteDiaryEntry>>(`/api/projects/${projectId}/diary`, {
        params: {
          entry_type: filters?.entry_type,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    enabled: !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateSiteDiaryEntry(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { entry_at: string; entry_type: string; entry_text: string }) =>
      apiFetch<SiteDiaryEntry>(`/api/projects/${projectId}/diary`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary', projectId] });
    },
  });
}

export function useUpdateSiteDiaryEntry(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      ...data
    }: {
      entryId: string;
      entry_at?: string;
      entry_type?: string;
      entry_text?: string;
    }) =>
      apiFetch<SiteDiaryEntry>(`/api/projects/${projectId}/diary/${entryId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary', projectId] });
    },
  });
}

// --- Task Comments ---

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => apiFetch<PaginatedResponse<TaskComment>>(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { comment_text: string }) =>
      apiFetch<TaskComment>(`/api/tasks/${taskId}/comments`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });
}

// --- Daily Logs ---

export function useDailyLogs(projectId: string, filters?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['daily-logs', projectId, filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<DailyLog>>(`/api/projects/${projectId}/daily-logs`, {
        params: {
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    enabled: !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateDailyLog(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      log_date: string;
      crew_count?: number;
      work_summary?: string;
      delays?: string;
      safety_notes?: string;
      weather?: Record<string, unknown>;
      is_offline_origin?: boolean;
    }) =>
      apiFetch<DailyLog>(`/api/projects/${projectId}/daily-logs`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs', projectId] });
    },
  });
}

export function useUpdateDailyLog(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      logId,
      ...data
    }: {
      logId: string;
      weather?: Record<string, unknown> | null;
      crew_count?: number | null;
      work_summary?: string | null;
      delays?: string | null;
      safety_notes?: string | null;
    }) =>
      apiFetch<DailyLog>(`/api/projects/${projectId}/daily-logs/${logId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs', projectId] });
    },
  });
}

// --- Meetings (site diary entries with entry_type = 'meeting') ---

export function useMeetings(projectId: string, filters?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['meetings', projectId, filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<SiteDiaryEntry>>(`/api/projects/${projectId}/meetings`, {
        params: {
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    enabled: !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateMeeting(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      meeting_date: string;
      title: string;
      attendees: string[];
      agenda?: string;
      notes: string;
      action_items?: Array<{ description: string; assignee?: string; due_date?: string }>;
    }) =>
      apiFetch<SiteDiaryEntry>(`/api/projects/${projectId}/meetings`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['site-diary', projectId] });
    },
  });
}
