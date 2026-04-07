'use client';

import { useQuery } from '@tanstack/react-query';

import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

interface AtAGlance {
  activeProjects: number;
  pendingExpenses: number;
  openLeads: number;
  unreadNotifications: number;
}

interface RecentProject {
  id: string;
  project_name: string;
  project_number: string;
  status: string;
  site_address: Record<string, string> | null;
  start_date: string | null;
  target_completion_date: string | null;
  baseline_budget: number;
  current_budget: number;
}

interface DashboardData {
  atAGlance: AtAGlance;
  recentProjects: RecentProject[];
}

export function useDashboard() {
  const { activeDivision } = useDivision();
  const divisionId = getDivisionFilter(activeDivision);

  return useQuery({
    queryKey: [...queryKeys.dashboard.all, divisionId ?? '__all__'],
    queryFn: () =>
      apiFetch<DashboardData>('/api/dashboard', {
        params: divisionId ? { division_id: divisionId } : undefined,
      }),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
