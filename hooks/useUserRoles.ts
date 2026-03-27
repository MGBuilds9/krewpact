'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface UserRole {
  role_key: string;
  role_name: string;
  is_primary: boolean;
}

export interface UserDivision {
  division_id: string;
}

export interface UserRolesResponse {
  roles: UserRole[];
  divisions: UserDivision[];
}

export function useUserRoles(userId: string | null) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => apiFetch<UserRolesResponse>(`/api/org/users/${userId}/roles`),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      roleKeys,
      divisionIds,
    }: {
      userId: string;
      roleKeys: string[];
      divisionIds?: string[];
    }) =>
      apiFetch<{ success: boolean; errors: string[] }>(`/api/org/users/${userId}/roles`, {
        method: 'PUT',
        body: { role_keys: roleKeys, division_ids: divisionIds },
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
    },
  });
}
