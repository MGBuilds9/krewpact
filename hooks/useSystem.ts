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

// ============================================================
// AI preferences
// ============================================================

export interface AiPreferences {
  insight_min_confidence: number;
  digest_enabled: boolean;
  ai_suggestions_enabled: boolean;
}

export function useAiPreferences() {
  return useQuery({
    queryKey: ['ai-preferences'],
    queryFn: () =>
      apiFetch<{ preferences: AiPreferences }>('/api/ai/preferences').then(
        (res) => res.preferences,
      ),
    staleTime: 60_000,
  });
}

export function useUpdateAiPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AiPreferences) =>
      apiFetch<{ preferences: AiPreferences }>('/api/ai/preferences', {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-preferences'] }),
  });
}

// ============================================================
// Admin sync status
// ============================================================

export interface EntityStat {
  entity_type: string;
  total: number;
  succeeded: number;
  failed: number;
  queued: number;
  last_sync_at: string | null;
}

export interface SyncError {
  id: string;
  job_id: string;
  error_message: string;
  error_code: string;
  created_at: string;
}

export interface SyncStatus {
  stats: EntityStat[];
  recent_errors: SyncError[];
  total_jobs: number;
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['admin-sync-status'],
    queryFn: () => apiFetch<SyncStatus>('/api/admin/sync/status'),
    staleTime: 30_000,
  });
}
