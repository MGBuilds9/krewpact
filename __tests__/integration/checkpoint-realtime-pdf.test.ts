/**
 * US-005: E2E Checkpoint — Realtime + PDF features verified
 *
 * Integration tests consolidating verification of US-001 through US-004:
 * - Realtime subscription lifecycle (subscribe, event, cache invalidation, unsubscribe)
 * - PDF generation pipeline (estimate, project-status, invalid type)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Realtime mocks ---
const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockImplementation((cb) => {
  if (cb) cb('SUBSCRIBED');
  return mockChannel;
});
const mockUnsubscribe = vi.fn().mockResolvedValue('ok');
const mockChannel = { on: mockOn, subscribe: mockSubscribe, unsubscribe: mockUnsubscribe };
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/pdf/generator', () => ({
  generatePdf: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { POST } from '@/app/api/pdf/generate/route';
import { auth } from '@clerk/nextjs/server';
import { generatePdf } from '@/lib/pdf/generator';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/pdf/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('US-005 Checkpoint: Realtime + PDF Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockImplementation((cb) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    });
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as ReturnType<
      typeof auth
    > extends Promise<infer T>
      ? T
      : never);
  });

  describe('Realtime subscription lifecycle', () => {
    it('full lifecycle: subscribe → receive event → invalidate cache → unsubscribe', () => {
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

      const { result, unmount } = renderHook(
        () =>
          useRealtimeSubscription({
            table: 'notifications',
            onEvent,
            queryKeys: [['notifications']],
          }),
        { wrapper: Wrapper },
      );

      // Step 1: Subscribe
      expect(result.current.isSubscribed).toBe(true);
      expect(mockSubscribe).toHaveBeenCalled();

      // Step 2: Receive event
      act(() => {
        realtimeCallback({
          eventType: 'INSERT',
          new: { id: '1', title: 'New notification' },
          old: {},
          schema: 'public',
          table: 'notifications',
          commit_timestamp: '2026-03-09T00:00:00Z',
        });
      });

      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'INSERT' }));

      // Step 3: Cache invalidation
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['notifications'],
      });

      // Step 4: Unsubscribe on unmount
      unmount();
      expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('PDF generation pipeline', () => {
    it('POST /api/pdf/generate with estimate data returns PDF buffer', async () => {
      const fakePdf = Buffer.from('%PDF-1.4 estimate content');
      vi.mocked(generatePdf).mockResolvedValue(fakePdf);

      const res = await POST(
        makeRequest({
          type: 'estimate',
          data: {
            companyName: 'MDM Group Inc.',
            estimateNumber: 'EST-001',
            date: '2026-03-01',
            client: { name: 'Acme', address: '123 Main', email: 'a@b.com' },
            lineItems: [
              { description: 'Drywall', quantity: 100, unit: 'sqft', unitCost: 5, markup: 10 },
            ],
            subtotal: 500,
            markupTotal: 50,
            taxRate: 13,
            taxAmount: 71.5,
            total: 621.5,
            terms: 'Net 30',
          },
        }) as never,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toContain('.pdf');

      const body = await res.arrayBuffer();
      expect(body.byteLength).toBe(fakePdf.length);
    });

    it('POST /api/pdf/generate with project status data returns PDF buffer', async () => {
      const fakePdf = Buffer.from('%PDF-1.4 project status');
      vi.mocked(generatePdf).mockResolvedValue(fakePdf);

      const res = await POST(
        makeRequest({
          type: 'project-status',
          data: {
            companyName: 'MDM Group Inc.',
            project: { name: 'Reno', code: 'P-001', status: 'active' },
            milestones: [{ name: 'M1', progress: 50, dueDate: '2026-04-01' }],
            taskSummary: { total: 10, completed: 5, inProgress: 3, overdue: 2 },
            recentLogs: [{ date: '2026-03-08', author: 'J.S.', summary: 'Done' }],
          },
        }) as never,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
    });

    it('POST /api/pdf/generate with invalid type returns 400', async () => {
      const res = await POST(makeRequest({ type: 'invoice', data: {} }) as never);
      expect(res.status).toBe(400);
    });
  });
});
