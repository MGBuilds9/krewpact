'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

export interface PortalMessage {
  id: string;
  project_id: string;
  sender_id: string;
  sender_type: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface MessagesResponse {
  data: PortalMessage[];
  total: number;
  hasMore: boolean;
}

export interface SendMessageInput {
  subject?: string;
  message: string;
}

export function usePortalMessages(projectId: string) {
  return useQuery({
    queryKey: ['portal-messages', projectId],
    queryFn: () => apiFetch<MessagesResponse>(`/api/portal/projects/${projectId}/messages`),
    enabled: !!projectId,
    staleTime: 15_000,
  });
}

export function useSendPortalMessage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageInput) =>
      apiFetch<PortalMessage>(`/api/portal/projects/${projectId}/messages`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages', projectId] });
    },
  });
}
