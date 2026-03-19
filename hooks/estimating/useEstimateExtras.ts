'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchList } from '@/lib/api-client';

import type { EstimateAllowance, EstimateAlternate } from './types';

// --- Estimate Alternates ---

export function useEstimateAlternates(estimateId: string) {
  return useQuery({
    queryKey: ['estimate-alternates', estimateId],
    queryFn: () => apiFetchList<EstimateAlternate>(`/api/estimates/${estimateId}/alternates`),
    enabled: !!estimateId,
  });
}

export function useCreateEstimateAlternate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, ...data }: Partial<EstimateAlternate> & { estimateId: string }) =>
      apiFetch<EstimateAlternate>(`/api/estimates/${estimateId}/alternates`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-alternates', variables.estimateId] });
    },
  });
}

export function useUpdateEstimateAlternate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      estimateId,
      alternateId,
      ...data
    }: Partial<EstimateAlternate> & { estimateId: string; alternateId: string }) =>
      apiFetch<EstimateAlternate>(`/api/estimates/${estimateId}/alternates/${alternateId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-alternates', variables.estimateId] });
    },
  });
}

export function useDeleteEstimateAlternate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, alternateId }: { estimateId: string; alternateId: string }) =>
      apiFetch(`/api/estimates/${estimateId}/alternates/${alternateId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-alternates', variables.estimateId] });
    },
  });
}

// --- Estimate Allowances ---

export function useEstimateAllowances(estimateId: string) {
  return useQuery({
    queryKey: ['estimate-allowances', estimateId],
    queryFn: () => apiFetchList<EstimateAllowance>(`/api/estimates/${estimateId}/allowances`),
    enabled: !!estimateId,
  });
}

export function useCreateEstimateAllowance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, ...data }: Partial<EstimateAllowance> & { estimateId: string }) =>
      apiFetch<EstimateAllowance>(`/api/estimates/${estimateId}/allowances`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-allowances', variables.estimateId] });
    },
  });
}

export function useUpdateEstimateAllowance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      estimateId,
      allowanceId,
      ...data
    }: Partial<EstimateAllowance> & { estimateId: string; allowanceId: string }) =>
      apiFetch<EstimateAllowance>(`/api/estimates/${estimateId}/allowances/${allowanceId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-allowances', variables.estimateId] });
    },
  });
}

export function useDeleteEstimateAllowance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, allowanceId }: { estimateId: string; allowanceId: string }) =>
      apiFetch(`/api/estimates/${estimateId}/allowances/${allowanceId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-allowances', variables.estimateId] });
    },
  });
}
