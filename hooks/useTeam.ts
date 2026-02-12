'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  is_internal: boolean;
  is_active: boolean;
  created_at: string;
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
