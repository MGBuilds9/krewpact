import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn(() => ({
  limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'smoke_test_results') return { insert: mockInsert };
      return { select: mockSelect };
    }),
  })),
}));

vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: vi.fn().mockResolvedValue({ authorized: true }),
}));

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'test', success: true }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock global fetch for external service checks
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: () => Promise.resolve('PONG'),
  json: () => Promise.resolve({ result: 'ok' }),
});
vi.stubGlobal('fetch', mockFetch);

describe('POST /api/cron/smoke-test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-stub after clearAllMocks
    vi.stubGlobal('fetch', mockFetch);
  });

  it('runs smoke checks and returns results', async () => {
    const { POST } = await import('@/app/api/cron/smoke-test/route');
    const req = new NextRequest('http://localhost:3000/api/cron/smoke-test', {
      method: 'POST',
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBeDefined();
    expect(data.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('rejects unauthorized requests', async () => {
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    vi.mocked(verifyCronAuth).mockResolvedValueOnce({ authorized: false });

    const { POST } = await import('@/app/api/cron/smoke-test/route');
    const req = new NextRequest('http://localhost:3000/api/cron/smoke-test', {
      method: 'POST',
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
