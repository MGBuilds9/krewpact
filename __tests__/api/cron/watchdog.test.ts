import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [
              { cron_name: 'scoring', status: 'success', started_at: new Date().toISOString() },
              { cron_name: 'enrichment', status: 'success', started_at: new Date().toISOString() },
            ],
            error: null,
          }),
        })),
      })),
      insert: mockInsert,
    })),
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

describe('GET /api/cron/watchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks cron run status and returns results', async () => {
    const { GET } = await import('@/app/api/cron/watchdog/route');
    const req = new NextRequest('http://localhost:3000/api/cron/watchdog', {
      method: 'GET',
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.total).toBeGreaterThan(0);
    expect(data.results).toBeInstanceOf(Array);
  });

  it('rejects unauthorized requests', async () => {
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    vi.mocked(verifyCronAuth).mockResolvedValueOnce({ authorized: false });

    const { GET } = await import('@/app/api/cron/watchdog/route');
    const req = new NextRequest('http://localhost:3000/api/cron/watchdog', {
      method: 'GET',
    });
    const response = await GET(req);
    expect(response.status).toBe(401);
  });
});
