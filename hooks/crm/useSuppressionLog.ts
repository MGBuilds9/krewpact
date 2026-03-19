import { useQuery } from '@tanstack/react-query';

import { apiFetchList } from '@/lib/api-client';

export interface SuppressionLogEntry {
  lead_id: string;
  company_name: string;
  account_name: string;
  match_type: string;
  match_score: number;
  created_at: string;
}

export function useSuppressionLog() {
  return useQuery({
    queryKey: ['suppression-log'],
    queryFn: () => apiFetchList<SuppressionLogEntry>('/api/crm/settings/suppression'),
    staleTime: 60_000,
  });
}
