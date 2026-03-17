'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface WebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  received_at: string;
  processed_at: string | null;
  processing_status: string;
  processing_error: string | null;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_user_id: string | null;
  action: string;
  before_payload: Record<string, unknown> | null;
  after_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export function useWebhookEvents(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['webhook-events', params],
    queryFn: () => apiFetch<PaginatedResponse<WebhookEvent>>('/api/system/webhooks', { params }),
    staleTime: 30_000,
  });
}

export function useReplayWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<WebhookEvent>(`/api/system/webhooks/${id}/replay`, { method: 'POST', body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-events'] });
    },
  });
}

export function useAuditLogs(params?: {
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => apiFetch<PaginatedResponse<AuditLog>>('/api/system/audit-logs', { params }),
    staleTime: 30_000,
  });
}
