'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

// Mock Supabase channel
const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockImplementation((callback) => {
  if (callback) callback('SUBSCRIBED');
  return mockChannel;
});
const mockUnsubscribe = vi.fn().mockResolvedValue('ok');

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  })),
}));

import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

// --- Test Wrapper ---

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    Wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    },
  };
}

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockOn to return mockChannel (for chaining)
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockImplementation((callback) => {
      if (callback) callback('SUBSCRIBED');
      return mockChannel;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribes to a Supabase Realtime channel on mount', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    // Should call .on() with postgres_changes
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'notifications',
      }),
      expect.any(Function),
    );

    // Should call .subscribe()
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('unsubscribes on unmount (no memory leaks)', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    const { unmount } = renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('triggers onEvent callback on INSERT events', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    // Capture the callback passed to .on()
    let realtimeCallback: (payload: unknown) => void = () => {};
    mockOn.mockImplementation(
      (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
        realtimeCallback = cb;
        return mockChannel;
      },
    );

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    // Simulate an INSERT event
    act(() => {
      realtimeCallback({
        eventType: 'INSERT',
        new: { id: '1', title: 'Test' },
        old: {},
        schema: 'public',
        table: 'notifications',
        commit_timestamp: '2026-03-09T00:00:00Z',
      });
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'INSERT',
        new: { id: '1', title: 'Test' },
      }),
    );
  });

  it('triggers onEvent callback on UPDATE events', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    let realtimeCallback: (payload: unknown) => void = () => {};
    mockOn.mockImplementation(
      (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
        realtimeCallback = cb;
        return mockChannel;
      },
    );

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    act(() => {
      realtimeCallback({
        eventType: 'UPDATE',
        new: { id: '1', title: 'Updated' },
        old: { id: '1', title: 'Original' },
        schema: 'public',
        table: 'notifications',
        commit_timestamp: '2026-03-09T00:00:00Z',
      });
    });

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'UPDATE' }));
  });

  it('triggers onEvent callback on DELETE events', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    let realtimeCallback: (payload: unknown) => void = () => {};
    mockOn.mockImplementation(
      (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
        realtimeCallback = cb;
        return mockChannel;
      },
    );

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    act(() => {
      realtimeCallback({
        eventType: 'DELETE',
        new: {},
        old: { id: '1' },
        schema: 'public',
        table: 'notifications',
        commit_timestamp: '2026-03-09T00:00:00Z',
      });
    });

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'DELETE' }));
  });

  it('invalidates React Query cache on events', () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const onEvent = vi.fn();

    let realtimeCallback: (payload: unknown) => void = () => {};
    mockOn.mockImplementation(
      (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
        realtimeCallback = cb;
        return mockChannel;
      },
    );

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
          queryKeys: [['notifications']],
        }),
      { wrapper: Wrapper },
    );

    act(() => {
      realtimeCallback({
        eventType: 'INSERT',
        new: { id: '1' },
        old: {},
        schema: 'public',
        table: 'notifications',
        commit_timestamp: '2026-03-09T00:00:00Z',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('applies filter when provided', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          filter: 'user_id=eq.abc-123',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=eq.abc-123',
      }),
      expect.any(Function),
    );
  });

  it('handles reconnection on channel error', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    let subscribeCallback: (status: string, err?: Error) => void = () => {};
    mockSubscribe.mockImplementation((cb) => {
      subscribeCallback = cb;
      return mockChannel;
    });

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    // Simulate channel error
    act(() => {
      subscribeCallback('CHANNEL_ERROR', new Error('connection lost'));
    });

    // Should attempt reconnection by calling removeChannel and re-subscribing
    // The hook should have attempted to reconnect
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('returns isSubscribed status', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    const { result } = renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.isSubscribed).toBe(true);
  });

  it('does not subscribe when enabled is false', () => {
    const { Wrapper } = createWrapper();
    const onEvent = vi.fn();

    // Clear all mock call counts before this test
    mockOn.mockClear();
    mockSubscribe.mockClear();

    renderHook(
      () =>
        useRealtimeSubscription({
          table: 'notifications',
          onEvent,
          enabled: false,
        }),
      { wrapper: Wrapper },
    );

    // subscribe should not be called when disabled
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockOn).not.toHaveBeenCalled();
  });
});
