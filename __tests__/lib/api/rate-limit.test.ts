import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {},
}));

vi.mock('@upstash/ratelimit', () => {
  const mockLimit = vi
    .fn()
    .mockResolvedValue({ success: true, remaining: 59, reset: Date.now() + 60000 });
  class MockRatelimit {
    limit = mockLimit;
    constructor() {}
    static slidingWindow = vi.fn().mockReturnValue('sliding-window');
  }
  return { Ratelimit: MockRatelimit };
});

describe('rateLimit', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  it('returns success when under limit', async () => {
    const { rateLimit } = await import('@/lib/api/rate-limit');
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const result = await rateLimit(req);
    expect(result.success).toBe(true);
  });

  it('fails open when Redis env vars missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { rateLimit } = await import('@/lib/api/rate-limit');
    const req = new Request('http://localhost/api/test');
    const result = await rateLimit(req);
    expect(result.success).toBe(true);
  });

  it('rateLimitResponse returns 429 with headers', async () => {
    const { rateLimitResponse } = await import('@/lib/api/rate-limit');
    const res = rateLimitResponse({ success: false, remaining: 0, reset: Date.now() + 30000 });
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});
