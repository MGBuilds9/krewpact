'use client';

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { invalidateQueryFamilies } from '@/lib/query-cache';
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
  queryKeys?: QueryKey[];
  /** Whether the subscription is active (default: true) */
  enabled?: boolean;
}

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const INVALIDATION_BATCH_DELAY_MS = 100;

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
  const invalidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInvalidationKeysRef = useRef<Map<string, QueryKey>>(new Map());
  const queryClient = useQueryClient();

  // Stable refs for callbacks to avoid re-subscribing on every render
  const onEventRef = useRef(onEvent);
  const queryKeysRef = useRef<readonly QueryKey[] | undefined>(queryKeys);
  const subscribeRef = useRef<() => void>(() => {});

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    queryKeysRef.current = queryKeys;
  }, [queryKeys]);

  const flushInvalidations = useCallback(() => {
    const keys = Array.from(pendingInvalidationKeysRef.current.values());
    pendingInvalidationKeysRef.current.clear();

    if (!keys.length) {
      invalidationTimerRef.current = null;
      return;
    }

    invalidationTimerRef.current = null;
    void invalidateQueryFamilies(queryClient, keys);
  }, [queryClient]);

  const queueInvalidations = useCallback(() => {
    const keys = queryKeysRef.current;
    if (!keys?.length) {
      return;
    }

    for (const key of keys) {
      pendingInvalidationKeysRef.current.set(JSON.stringify(key), key);
    }

    if (invalidationTimerRef.current) {
      return;
    }

    invalidationTimerRef.current = setTimeout(flushInvalidations, INVALIDATION_BATCH_DELAY_MS);
  }, [flushInvalidations]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pendingInvalidations = pendingInvalidationKeysRef.current;

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
          queueInvalidations();
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
      if (invalidationTimerRef.current) {
        clearTimeout(invalidationTimerRef.current);
        invalidationTimerRef.current = null;
      }
      pendingInvalidations.clear();
      if (channelRef.current) {
        const supabase = createBrowserClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [enabled, table, filter, queryClient, queueInvalidations]);

  return { isSubscribed };
}
