'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface WorkflowActionResult {
  id: string;
  project_id: string;
  co_number: string;
  status: string;
  approved_at: string | null;
  approved_by: string | null;
  reason: string | null;
  amount_delta: number | null;
  days_delta: number | null;
  updated_at: string;
}

function invalidateKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  coId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  queryClient.invalidateQueries({ queryKey: ['change-order', projectId, coId] });
}

export function useApproveChangeOrder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coId, comment }: { coId: string; comment?: string }) =>
      apiFetch<WorkflowActionResult>(`/api/projects/${projectId}/change-orders/${coId}/approve`, {
        method: 'POST',
        body: { comment },
      }),
    onSuccess: (_, variables) => {
      invalidateKeys(queryClient, projectId, variables.coId);
    },
  });
}

export function useRejectChangeOrder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coId, reason }: { coId: string; reason: string }) =>
      apiFetch<WorkflowActionResult>(`/api/projects/${projectId}/change-orders/${coId}/reject`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: (_, variables) => {
      invalidateKeys(queryClient, projectId, variables.coId);
    },
  });
}

export function useSubmitChangeOrderToClient(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coId }: { coId: string }) =>
      apiFetch<WorkflowActionResult>(
        `/api/projects/${projectId}/change-orders/${coId}/submit-to-client`,
        { method: 'POST' },
      ),
    onSuccess: (_, variables) => {
      invalidateKeys(queryClient, projectId, variables.coId);
    },
  });
}

export function useSubmitChangeOrderForApproval(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coId }: { coId: string }) =>
      apiFetch<WorkflowActionResult>(
        `/api/projects/${projectId}/change-orders/${coId}/submit-for-approval`,
        { method: 'POST' },
      ),
    onSuccess: (_, variables) => {
      invalidateKeys(queryClient, projectId, variables.coId);
    },
  });
}
