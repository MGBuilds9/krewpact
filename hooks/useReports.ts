'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Report {
  id: string;
  report_type: string;
  report_date: string;
  status: string;
  data: Record<string, unknown> | null;
  project_id: string | null;
  division_id: string | null;
  created_at: string;
  user: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  project: { name: string } | null;
}

export interface ReportCreate {
  report_type: string;
  report_date: string;
  project_id?: string;
  division_id?: string;
  data?: Record<string, unknown>;
}

export const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'safety', label: 'Safety Report' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'progress', label: 'Progress Report' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'other', label: 'Other' },
];

export function useReports(options?: { reportType?: string; status?: string }) {
  return useQuery({
    queryKey: ['reports', options?.reportType, options?.status],
    queryFn: () =>
      apiFetch<Report[]>('/api/reports', {
        params: {
          report_type: options?.reportType,
          status: options?.status,
        },
      }),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReportCreate) =>
      apiFetch<Report>('/api/reports', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Report> & { id: string }) =>
      apiFetch<Report>(`/api/reports/${id}`, { method: 'PATCH', body: data }),
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
