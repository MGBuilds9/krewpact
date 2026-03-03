'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { GraphListResponse, GraphMessage } from '@/lib/microsoft/types';

interface UseEmailOptions {
  mailbox?: string;
  folder?: 'inbox' | 'sentitems' | 'drafts';
  top?: number;
  search?: string;
}

export function useEmailMessages(options: UseEmailOptions = {}) {
  const { mailbox, folder = 'inbox', top = 25, search } = options;

  return useQuery({
    queryKey: ['email', 'messages', { mailbox, folder, top, search }],
    queryFn: () =>
      apiFetch<GraphListResponse<GraphMessage>>('/api/email/messages', {
        params: {
          ...(mailbox && { mailbox }),
          folder,
          top,
          ...(search && { search }),
        },
      }),
    staleTime: 60_000,
  });
}

export function useEmailMessage(id: string, mailbox?: string) {
  return useQuery({
    queryKey: ['email', 'message', id, mailbox],
    queryFn: () =>
      apiFetch<GraphMessage>(`/api/email/messages/${id}`, {
        params: mailbox ? { mailbox } : {},
      }),
    enabled: !!id,
  });
}

interface SendEmailParams {
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  subject: string;
  body: string;
  bodyType?: 'Text' | 'HTML';
  leadId?: string;
  contactId?: string;
  accountId?: string;
  mailbox?: string;
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SendEmailParams) =>
      apiFetch('/api/email/send', { method: 'POST', body: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
