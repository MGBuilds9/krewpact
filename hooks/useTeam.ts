'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  status: string;
  created_at: string;
  user_divisions?: { division_id: string; is_primary: boolean; left_at: string | null }[];
}

export function useTeamMembers(search?: string) {
  return useQuery({
    queryKey: ['team', search],
    queryFn: () =>
      apiFetch<TeamMember[]>('/api/team', {
        params: search ? { search } : undefined,
      }),
  });
}
