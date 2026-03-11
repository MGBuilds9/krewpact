'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface Notification {
  id: string;
  title: string;
  message: string | null;
  channel: string;
  state: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
  payload: unknown;
  read_at: string | null;
  created_at: string;
}

interface PaginatedNotifications {
  data: Notification[];
  total: number;
  hasMore: boolean;
}

export function useNotifications(options?: { unreadOnly?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ unreadOnly: options?.unreadOnly }),
    queryFn: async () => {
      const res = await apiFetch<PaginatedNotifications>('/api/notifications', {
        params: options?.unreadOnly ? { unread_only: 'true' } : undefined,
      });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: 'PATCH', body: { state: 'read' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch('/api/notifications', { method: 'POST', body: { action: 'mark_all_read' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
