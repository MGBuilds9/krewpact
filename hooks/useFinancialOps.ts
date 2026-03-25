'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type {
  AgedReceivablesReport,
  HoldbackSchedule,
  PaymentHistory,
} from '@/lib/services/financial-ops';

export function useHoldbackSchedule(projectId: string | undefined) {
  return useQuery({
    queryKey: ['holdback-schedule', projectId],
    queryFn: () =>
      apiFetch<HoldbackSchedule>('/api/finance/holdbacks', {
        params: { project_id: projectId },
      }),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}

export function useAgedReceivables(orgId?: string) {
  return useQuery({
    queryKey: ['aged-receivables', orgId],
    queryFn: () =>
      apiFetch<AgedReceivablesReport>('/api/finance/aged-receivables', {
        params: orgId ? { org_id: orgId } : undefined,
      }),
    staleTime: 120_000,
  });
}

export function usePaymentHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ['payment-history', projectId],
    queryFn: () =>
      apiFetch<PaymentHistory>('/api/finance/payment-entries', {
        params: { project_id: projectId },
      }),
    staleTime: 60_000,
    enabled: !!projectId,
  });
}
