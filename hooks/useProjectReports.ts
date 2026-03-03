'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface ProjectDailyLog {
  id: string;
  project_id: string;
  log_date: string;
  work_summary: string | null;
  crew_count: number | null;
  weather: Record<string, unknown> | null;
  delays: string | null;
  safety_notes: string | null;
  submitted_user: { first_name: string | null; last_name: string | null } | null;
}

export function useProjectReports(projectId: string) {
  return useQuery({
    queryKey: ['project-reports', projectId],
    queryFn: () => apiFetch<ProjectDailyLog[]>(`/api/projects/${projectId}/reports`),
    enabled: !!projectId,
  });
}
