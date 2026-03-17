'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  member_role: string;
  allocation_pct: number | null;
  joined_at: string;
  left_at: string | null;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => apiFetch<ProjectMember[]>(`/api/projects/${projectId}/members`),
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; member_role: string; allocation_pct?: number | null }) =>
      apiFetch<ProjectMember>(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        params: { member_id: memberId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}
