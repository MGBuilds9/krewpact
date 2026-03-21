'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { TakeoffJobStatus } from '@/lib/takeoff/types';
import { ACTIVE_JOB_STATUSES } from '@/lib/takeoff/types';

// --- Types ---

export interface TakeoffPlan {
  id: string;
  filename: string;
  storage_path: string;
}

export interface TakeoffJob {
  id: string;
  estimate_id: string;
  status: TakeoffJobStatus;
  config: Record<string, unknown>;
  summary: Record<string, unknown> | null;
  error_message: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  takeoff_plans?: TakeoffPlan[];
}

export interface TakeoffDraftLine {
  id: string;
  job_id: string;
  trade: string;
  csi_code: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number | null;
  cost_source: string | null;
  confidence: number;
  source_pages: number[] | null;
  source_regions: Record<string, unknown>[] | null;
  notes: string | null;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  final_line_id: string | null;
  created_at: string;
}

// --- Hooks ---

export function useTakeoffJobs(estimateId: string) {
  return useQuery({
    queryKey: queryKeys.takeoff.byEstimate(estimateId),
    queryFn: async () => {
      const res = await apiFetch<{ jobs: TakeoffJob[] }>(`/api/estimates/${estimateId}/takeoff`);
      return res.jobs;
    },
    enabled: !!estimateId,
    staleTime: 30_000,
  });
}

export function useTakeoffActiveJob(estimateId: string) {
  const query = useTakeoffJobs(estimateId);
  const activeJob = query.data?.find((job) => ACTIVE_JOB_STATUSES.includes(job.status)) ?? null;
  return { ...query, activeJob };
}

export function useTakeoffJobStatus(estimateId: string, jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.takeoff.job(estimateId, jobId ?? ''),
    queryFn: () => apiFetch<TakeoffJob>(`/api/estimates/${estimateId}/takeoff/${jobId}`),
    enabled: !!estimateId && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ACTIVE_JOB_STATUSES.includes(status)) return 5000;
      return false;
    },
  });
}

export function useCreateTakeoffJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ estimateId, files }: { estimateId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await fetch(`/api/estimates/${estimateId}/takeoff`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }
      return res.json() as Promise<TakeoffJob>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.takeoff.byEstimate(variables.estimateId),
      });
    },
  });
}

export function useCancelTakeoffJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, jobId }: { estimateId: string; jobId: string }) =>
      apiFetch<{ success: boolean; status: string }>(
        `/api/estimates/${estimateId}/takeoff/${jobId}`,
        {
          method: 'POST',
          body: { action: 'cancel' },
        },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.takeoff.byEstimate(variables.estimateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.takeoff.job(variables.estimateId, variables.jobId),
      });
    },
  });
}

export function useTakeoffDraftLines(estimateId: string, jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.takeoff.lines(estimateId, jobId ?? ''),
    queryFn: () =>
      apiFetch<TakeoffDraftLine[]>(`/api/estimates/${estimateId}/takeoff/${jobId}/lines`),
    enabled: !!estimateId && !!jobId,
    staleTime: 60_000,
  });
}
