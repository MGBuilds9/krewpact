'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

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

export function useNotifications(options?: { unreadOnly?: boolean }) {
  return useQuery({
    queryKey: ['notifications', options?.unreadOnly],
    queryFn: () =>
      apiFetch<Notification[]>('/api/notifications', {
        params: options?.unreadOnly ? { unread_only: 'true' } : undefined,
      }),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: 'PATCH', body: { state: 'read' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch('/api/notifications', { method: 'POST', body: { action: 'mark_all_read' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
