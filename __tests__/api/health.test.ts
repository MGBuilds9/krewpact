import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          abortSignal: vi.fn().mockResolvedValue({ error: null }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function makeRequest(url = 'http://localhost:3000/api/health') {
  return new NextRequest(url);
}

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(makeRequest());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.checks.supabase).toBe('ok');
  });

  it('returns deep checks when ?deep=true with valid CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const { GET } = await import('@/app/api/health/route');
    const req = new NextRequest('http://localhost:3000/api/health?deep=true', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(req);
    const data = await response.json();
    expect(data.timestamp).toBeDefined();
    expect(data.checks).toBeDefined();
  });

  it('returns 401 for deep check without auth', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(makeRequest('http://localhost:3000/api/health?deep=true'));
    expect(response.status).toBe(401);
  });
});
