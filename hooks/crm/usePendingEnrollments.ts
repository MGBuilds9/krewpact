import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';

export interface PendingEnrollment {
  id: string;
  sequence_id: string;
  lead_id: string;
  contact_id: string | null;
  status: string;
  current_step: number;
  current_step_id: string;
  next_step_at: string | null;
  trigger_type: string;
  trigger_event: string | null;
  enrolled_at: string;
  leads: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    stage: string;
    division_id: string | null;
  } | null;
  outreach_sequences: {
    id: string;
    name: string;
    division_id: string | null;
  } | null;
}

export function usePendingEnrollments() {
  return useQuery({
    queryKey: ['pending-enrollments'],
    queryFn: () => apiFetchList<PendingEnrollment>('/api/crm/sequences/pending-enrollments'),
    staleTime: 30_000,
  });
}

export function useApproveEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/crm/sequences/pending-enrollments/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
    },
  });
}

export function useRejectEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/crm/sequences/pending-enrollments/${id}/reject`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
    },
  });
}
