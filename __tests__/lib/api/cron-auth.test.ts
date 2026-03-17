import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/queue/verify', () => ({
  verifyQStashSignature: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('verifyCronAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('accepts valid Bearer token', async () => {
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = new NextRequest('http://localhost/api/cron/test', {
      headers: { authorization: 'Bearer test-cron-secret' },
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(true);
  });

  it('rejects invalid Bearer token', async () => {
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = new NextRequest('http://localhost/api/cron/test', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(false);
  });

  it('accepts valid QStash signature', async () => {
    const { verifyQStashSignature } = await import('@/lib/queue/verify');
    (verifyQStashSignature as ReturnType<typeof vi.fn>).mockResolvedValue({
      valid: true,
      body: '{}',
    });

    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = new NextRequest('http://localhost/api/cron/test', {
      headers: { 'upstash-signature': 'valid-sig' },
      method: 'POST',
      body: '{}',
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(true);
  });

  it('rejects no credentials', async () => {
    delete process.env.CRON_SECRET;
    delete process.env.WEBHOOK_SIGNING_SECRET;
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = new NextRequest('http://localhost/api/cron/test');
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(false);
  });
});
