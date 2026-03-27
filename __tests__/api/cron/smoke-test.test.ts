import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn(() => ({
  limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
}));

// Cooldown query mock: smoke_test_results select → neq → order → limit → maybeSingle
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockCooldownChain = () => ({
  neq: vi.fn(() => ({
    order: vi.fn(() => ({
      limit: vi.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
  })),
});

// Previous-run query mock: select → order → limit → range → maybeSingle
const mockPrevRunMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockPrevRunChain = () => ({
  order: vi.fn(() => ({
    limit: vi.fn(() => ({
      range: vi.fn(() => ({
        maybeSingle: mockPrevRunMaybeSingle,
      })),
    })),
  })),
});

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'smoke_test_results') {
        return {
          insert: mockInsert,
          select: vi.fn((cols: string) => {
            // Cooldown check queries 'created_at, status'
            if (cols === 'created_at, status') return mockCooldownChain();
            // Previous run check queries 'status'
            if (cols === 'status') return mockPrevRunChain();
            return mockCooldownChain();
          }),
        };
      }
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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// Mock global fetch for external service checks
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: () => Promise.resolve('PONG'),
  json: () => Promise.resolve({ result: 'ok' }),
});
vi.stubGlobal('fetch', mockFetch);

describe('GET /api/cron/smoke-test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-stub after clearAllMocks
    vi.stubGlobal('fetch', mockFetch);
  });

  it('runs smoke checks and returns results', async () => {
    const { GET } = await import('@/app/api/cron/smoke-test/route');
    const req = new NextRequest('http://localhost:3000/api/cron/smoke-test', {
      method: 'GET',
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBeDefined();
    expect(data.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('suppresses alert email when previous run also failed (cooldown)', async () => {
    // Make health endpoint fail so there's a failure
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('error'),
      json: () => Promise.resolve({}),
    });

    // Simulate a recent previous failure (within cooldown window)
    mockMaybeSingle.mockResolvedValueOnce({
      data: { created_at: new Date().toISOString(), status: 'fail' },
      error: null,
    });
    // Previous run was also a failure → should suppress
    mockPrevRunMaybeSingle.mockResolvedValueOnce({
      data: { status: 'fail' },
      error: null,
    });

    const { GET } = await import('@/app/api/cron/smoke-test/route');
    const req = new NextRequest('http://localhost:3000/api/cron/smoke-test', {
      method: 'GET',
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Email should NOT have been sent (cooldown active)
    const { sendEmail } = await import('@/lib/email/resend');
    expect(sendEmail).not.toHaveBeenCalled();

    // Restore fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('PONG'),
      json: () => Promise.resolve({ result: 'ok' }),
    });
  });

  it('rejects unauthorized requests', async () => {
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    vi.mocked(verifyCronAuth).mockResolvedValueOnce({ authorized: false });

    const { GET } = await import('@/app/api/cron/smoke-test/route');
    const req = new NextRequest('http://localhost:3000/api/cron/smoke-test', {
      method: 'GET',
    });
    const response = await GET(req);
    expect(response.status).toBe(401);
  });
});
