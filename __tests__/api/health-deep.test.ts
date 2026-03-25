import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Supabase mock: supports divisions query (shallow) + deep checks
const mockAbortSignal = vi.fn().mockResolvedValue({ error: null });
const mockDeepSelect = vi.fn(() => ({
  limit: vi.fn(() => ({ abortSignal: mockAbortSignal })),
  order: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [] }) })),
}));
const mockCountSelect = vi
  .fn()
  .mockResolvedValue({ count: 5, error: null });

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'divisions') {
        return {
          select: vi.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) return { count: 3, error: null };
            return { limit: vi.fn(() => ({ abortSignal: mockAbortSignal })) };
          }),
        };
      }
      if (table === 'leads' || table === 'projects') {
        return { select: vi.fn().mockResolvedValue({ count: 5, error: null }) };
      }
      if (table === 'cron_runs') {
        return { select: mockDeepSelect };
      }
      return { select: mockDeepSelect };
    }),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ result: 'ok' }),
});
vi.stubGlobal('fetch', mockFetch);

function makeDeepRequest() {
  return new NextRequest('http://localhost:3000/api/health?deep=true');
}

describe('GET /api/health?deep=true — Sentry DSN check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('reports sentry ok when SENTRY_DSN is a valid URL', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://abc123@o123456.ingest.sentry.io/789');
    const { GET } = await import('@/app/api/health/route');
    const res = await GET(makeDeepRequest());
    const data = await res.json();
    expect(data.checks.sentry).toBe('ok');
  });

  it('reports sentry degraded when SENTRY_DSN is missing', async () => {
    vi.stubEnv('SENTRY_DSN', '');
    const { GET } = await import('@/app/api/health/route');
    const res = await GET(makeDeepRequest());
    const data = await res.json();
    expect(data.checks.sentry).toBe('degraded');
  });

  it('reports sentry degraded when SENTRY_DSN is not a valid URL', async () => {
    vi.stubEnv('SENTRY_DSN', 'not-a-url');
    const { GET } = await import('@/app/api/health/route');
    const res = await GET(makeDeepRequest());
    const data = await res.json();
    expect(data.checks.sentry).toBe('degraded');
  });

  it('reports sentry degraded when SENTRY_DSN has no project path', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://abc@o123.ingest.sentry.io');
    const { GET } = await import('@/app/api/health/route');
    const res = await GET(makeDeepRequest());
    const data = await res.json();
    expect(data.checks.sentry).toBe('degraded');
  });

  it('deep check includes sentry alongside other checks', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://key@o999.ingest.sentry.io/42');
    const { GET } = await import('@/app/api/health/route');
    const res = await GET(makeDeepRequest());
    const data = await res.json();
    expect(data.checks).toHaveProperty('sentry');
    expect(data.checks).toHaveProperty('supabase');
  });

  it('shallow check does NOT include sentry', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://key@o999.ingest.sentry.io/42');
    const { GET } = await import('@/app/api/health/route');
    const res = await GET(new NextRequest('http://localhost:3000/api/health'));
    const data = await res.json();
    expect(data.checks).not.toHaveProperty('sentry');
  });
});
