'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

import type { PaginatedResponse } from './types';

export interface EnrichmentJob {
  id: string;
  lead_id: string;
  status: string;
  source: string;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  lastRunAt: string | null;
}

export interface EnrichmentConfig {
  sources: Array<{ name: string; enabled: boolean; order: number }>;
}

export function useEnrichmentJobs(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ['enrichment-jobs', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<EnrichmentJob>>(`/api/crm/enrichment?${searchParams.toString()}`),
  });
}

export function useEnrichmentStats() {
  return useQuery({
    queryKey: ['enrichment-stats'],
    queryFn: () => apiFetch<EnrichmentStats>('/api/crm/enrichment/stats'),
    staleTime: 30_000,
  });
}

export function useEnrichmentConfig() {
  return useQuery({
    queryKey: ['enrichment-config'],
    queryFn: () => apiFetch<EnrichmentConfig>('/api/crm/enrichment/config'),
  });
}

export function useRetryEnrichment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<EnrichmentJob>(`/api/crm/enrichment/${id}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrichment-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
    },
  });
}

export function useUpdateEnrichmentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnrichmentConfig) =>
      apiFetch<EnrichmentConfig>('/api/crm/enrichment/config', { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrichment-config'] });
    },
  });
}
