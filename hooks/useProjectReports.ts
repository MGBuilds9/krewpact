'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface ProjectReport {
  id: string;
  project_id: string;
  report_type: string;
  status: string;
  report_date: string;
  user: { first_name: string | null; last_name: string | null } | null;
}

export const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'safety', label: 'Safety Report' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'progress', label: 'Progress Report' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'other', label: 'Other' },
];

export function useProjectReports(projectId: string) {
  return useQuery({
    queryKey: ['project-reports', projectId],
    queryFn: () => apiFetch<ProjectReport[]>(`/api/projects/${projectId}/reports`),
    enabled: !!projectId,
  });
}
