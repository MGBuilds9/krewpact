'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { GraphEvent, GraphListResponse } from '@/lib/microsoft/types';

interface UseCalendarOptions {
  mailbox?: string;
  startDateTime?: string;
  endDateTime?: string;
  top?: number;
}

export function useCalendarEvents(options: UseCalendarOptions = {}) {
  const { mailbox, startDateTime, endDateTime, top = 25 } = options;

  return useQuery({
    queryKey: ['calendar', 'events', { mailbox, startDateTime, endDateTime, top }],
    queryFn: () =>
      apiFetch<GraphListResponse<GraphEvent>>('/api/calendar/events', {
        params: {
          ...(mailbox && { mailbox }),
          ...(startDateTime && { startDateTime }),
          ...(endDateTime && { endDateTime }),
          top,
        },
      }),
    staleTime: 60_000,
  });
}

export function useCalendarEvent(id: string, mailbox?: string) {
  return useQuery({
    queryKey: ['calendar', 'event', id, mailbox],
    queryFn: () =>
      apiFetch<GraphEvent>(`/api/calendar/events/${id}`, {
        params: mailbox ? { mailbox } : {},
      }),
    enabled: !!id,
  });
}

interface CreateEventParams {
  subject: string;
  body?: string;
  bodyType?: 'Text' | 'HTML';
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  location?: string;
  mailbox?: string;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateEventParams) =>
      apiFetch('/api/calendar/events', { method: 'POST', body: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
    },
  });
}
