'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
}));

import { usePortalMessages, useSendPortalMessage } from '@/hooks/usePortalMessages';
import { apiFetch } from '@/lib/api-client';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('usePortalMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches messages for a project', async () => {
    const mockResponse = {
      data: [
        {
          id: 'msg-1',
          project_id: 'proj-1',
          sender_id: 'user-1',
          sender_type: 'client',
          subject: 'Hello',
          body: 'Test message',
          is_read: false,
          created_at: '2026-03-25T10:00:00Z',
        },
      ],
      total: 1,
      hasMore: false,
    };
    mockApiFetch.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePortalMessages('proj-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith('/api/portal/projects/proj-1/messages');
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('is disabled when projectId is empty', () => {
    const { result } = renderHook(() => usePortalMessages(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('returns error state when fetch fails', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePortalMessages('proj-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});

describe('useSendPortalMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a message to the correct endpoint', async () => {
    const mockMessage = {
      id: 'msg-2',
      project_id: 'proj-1',
      sender_id: 'user-1',
      sender_type: 'client',
      subject: 'Test',
      body: 'Hello world',
      is_read: false,
      created_at: '2026-03-25T11:00:00Z',
    };
    mockApiFetch.mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendPortalMessage('proj-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ subject: 'Test', message: 'Hello world' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith('/api/portal/projects/proj-1/messages', {
      method: 'POST',
      body: { subject: 'Test', message: 'Hello world' },
    });
  });

  it('sends a message without subject', async () => {
    const mockMessage = {
      id: 'msg-3',
      project_id: 'proj-1',
      sender_id: 'user-1',
      sender_type: 'client',
      subject: null,
      body: 'No subject',
      is_read: false,
      created_at: '2026-03-25T12:00:00Z',
    };
    mockApiFetch.mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendPortalMessage('proj-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ message: 'No subject' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith('/api/portal/projects/proj-1/messages', {
      method: 'POST',
      body: { message: 'No subject' },
    });
  });
});
