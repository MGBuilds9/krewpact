'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  status: 'planning' | 'active' | 'on_hold' | 'substantial_complete' | 'closed' | 'cancelled';
  division_id: string;
  site_address: Record<string, string> | null;
  baseline_budget: number;
  current_budget: number;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  baseline_schedule: unknown;
  account_id: string | null;
  contact_id: string | null;
  contract_id: string | null;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseProjectsOptions {
  divisionId?: string;
  limit?: number;
}

export function useProjects(options?: UseProjectsOptions) {
  const { divisionId, limit } = options ?? {};

  return useQuery({
    queryKey: queryKeys.projects.list({ divisionId, limit }),
    queryFn: () =>
      apiFetch<Project[]>('/api/projects', {
        params: {
          division_id: divisionId,
          limit,
        },
      }),
    staleTime: 30_000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => apiFetch<Project>(`/api/projects/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      apiFetch<Project>('/api/projects', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) =>
      apiFetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
