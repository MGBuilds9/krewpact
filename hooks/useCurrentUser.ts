'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import { useImpersonation } from '@/contexts/ImpersonationContext';
import { apiFetch } from '@/lib/api-client';

export interface CurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'worker';
  is_active: boolean;
  created_at: string;
}

export function useCurrentUser() {
  const { user: clerkUser } = useUser();
  const { impersonatedUserId } = useImpersonation();

  return useQuery({
    queryKey: ['current-user', clerkUser?.id, impersonatedUserId],
    queryFn: async (): Promise<CurrentUser | null> => {
      if (impersonatedUserId) {
        // Fetch impersonated user via BFF
        return apiFetch<CurrentUser>(`/api/user/current?impersonate=${impersonatedUserId}`);
      }

      if (!clerkUser) return null;
      return apiFetch<CurrentUser>('/api/user/current');
    },
    enabled: !!clerkUser || !!impersonatedUserId,
  });
}
