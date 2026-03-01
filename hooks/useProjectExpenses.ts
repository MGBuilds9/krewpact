'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface ProjectExpense {
  id: string;
  project_id: string;
  amount: number;
  category: string;
  status: string;
  description: string | null;
  expense_date: string;
  user: { first_name: string | null; last_name: string | null } | null;
}

export function useProjectExpenses(projectId: string) {
  return useQuery({
    queryKey: ['project-expenses', projectId],
    queryFn: () => apiFetch<ProjectExpense[]>(`/api/projects/${projectId}/expenses`),
    enabled: !!projectId,
  });
}
