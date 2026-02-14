'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useDivision } from '@/contexts/DivisionContext';

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
