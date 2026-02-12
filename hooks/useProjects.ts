'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Project {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  contract_value: number | null;
  division_id: string | null;
  manager_id: string | null;
  created_by: string | null;
  client_name: string | null;
  client_contact: string | null;
  client_email: string | null;
  client_phone: string | null;
  address: string | null;
  spent: number | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
}

interface UseProjectsOptions {
  divisionId?: string;
  limit?: number;
}

export function useProjects(options?: UseProjectsOptions) {
  const { divisionId, limit } = options ?? {};

  return useQuery({
    queryKey: ['projects', divisionId, limit],
    queryFn: () =>
      apiFetch<Project[]>('/api/projects', {
        params: {
          division_id: divisionId,
          limit,
        },
      }),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiFetch<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      apiFetch<Project>('/api/projects', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) =>
      apiFetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
