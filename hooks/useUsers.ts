'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetchList } from '@/lib/api-client';

export interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  status: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetchList<User>('/api/users'),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
