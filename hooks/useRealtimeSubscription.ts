'use client';

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';

export type RealtimeEvent = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface UseRealtimeSubscriptionOptions {
  /** Supabase table name to subscribe to */
  table: string;
  /** Optional Postgres filter (e.g. 'user_id=eq.abc-123') */
  filter?: string;
  /** Callback fired on INSERT/UPDATE/DELETE events */
  onEvent: (payload: RealtimeEvent) => void;
  /** React Query keys to invalidate on events */
  queryKeys?: unknown[][];
  /** Whether the subscription is active (default: true) */
  enabled?: boolean;
}

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

// eslint-disable-next-line max-lines-per-function
export function useRealtimeSubscription({
  table,
  filter,
  onEvent,
  queryKeys,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Stable refs for callbacks to avoid re-subscribing on every render
  const onEventRef = useRef(onEvent);
  const queryKeysRef = useRef(queryKeys);
  const subscribeRef = useRef<() => void>(() => {});

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    queryKeysRef.current = queryKeys;
  }, [queryKeys]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function doSubscribe() {
      const supabase = createBrowserClient();
      const channelName = filter ? `realtime:${table}:${filter}` : `realtime:${table}`;

      const channelConfig: {
        event: '*';
        schema: 'public';
        table: string;
        filter?: string;
      } = {
        event: '*' as const,
        schema: 'public' as const,
        table,
      };

      if (filter) {
        channelConfig.filter = filter;
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', channelConfig, (payload: RealtimeEvent) => {
          onEventRef.current(payload);

          // Invalidate React Query caches
          const keys = queryKeysRef.current;
          if (keys) {
            for (const key of keys) {
              queryClient.invalidateQueries({ queryKey: key });
            }
          }
        })
        .subscribe((status, _err) => {
          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
            reconnectAttemptsRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsSubscribed(false);

            // Attempt reconnection with backoff
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current += 1;
              supabase.removeChannel(channel);
              channelRef.current = null;

              const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
              reconnectTimerRef.current = setTimeout(() => {
                subscribeRef.current();
              }, delay);
            }
          } else if (status === 'CLOSED') {
            setIsSubscribed(false);
          }
        });

      channelRef.current = channel;
    }

    subscribeRef.current = doSubscribe;
    doSubscribe();

    return () => {
      // Cleanup on unmount
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        const supabase = createBrowserClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [enabled, table, filter, queryClient]);

  return { isSubscribed };
}
