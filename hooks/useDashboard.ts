'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useDivision } from '@/contexts/DivisionContext';

interface AtAGlance {
  activeProjects: number;
  pendingExpenses: number;
  pendingReports: number;
  unreadNotifications: number;
}

interface RecentProject {
  id: string;
  name: string;
  status: string;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  spent: number | null;
}

interface DashboardData {
  atAGlance: AtAGlance;
  recentProjects: RecentProject[];
}

export function useDashboard() {
  const { activeDivision } = useDivision();

  return useQuery({
    queryKey: ['dashboard', activeDivision?.id],
    queryFn: () =>
      apiFetch<DashboardData>('/api/dashboard', {
        params: activeDivision?.id ? { division_id: activeDivision.id } : undefined,
      }),
    enabled: !!activeDivision,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
