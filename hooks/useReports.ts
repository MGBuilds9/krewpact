'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  work_summary: string | null;
  crew_count: number | null;
  weather: Record<string, unknown> | null;
  delays: string | null;
  safety_notes: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  is_offline_origin: boolean;
  created_at: string;
  submitted_user: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  project: { project_name: string } | null;
}

export interface DailyLogCreate {
  project_id: string;
  log_date: string;
  work_summary?: string;
  crew_count?: number;
  weather?: Record<string, unknown>;
  delays?: string;
  safety_notes?: string;
}

export function useReports(options?: { projectId?: string; submittedBy?: string }) {
  return useQuery({
    queryKey: ['reports', options?.projectId, options?.submittedBy],
    queryFn: () =>
      apiFetch<DailyLog[]>('/api/reports', {
        params: {
          project_id: options?.projectId,
          submitted_by: options?.submittedBy,
        },
      }),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DailyLogCreate) =>
      apiFetch<DailyLog>('/api/reports', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DailyLog> & { id: string }) =>
      apiFetch<DailyLog>(`/api/reports/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/reports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
