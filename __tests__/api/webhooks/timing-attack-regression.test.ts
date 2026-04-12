/**
 * Regression tests: timing-attack protection across all webhook endpoints.
 *
 * Sentinel PR #135 added timingSafeEqual to 6 files. These tests verify that
 * mismatched-length, wrong-content, missing, and unconfigured secrets all
 * result in the correct rejection — and that a valid secret passes through.
 *
 * Covered:
 *   1. lib/api/cron-auth.ts          — verifyCronAuth() Bearer comparison
 *   2. app/api/health/route.ts       — ?deep=true cron auth gate
 *   3. app/api/web/leads/route.ts    — x-webhook-secret header (plain-equal)
 *   4. app/api/webhooks/erpnext/route.ts — x-webhook-secret header
 *   5. app/api/webhooks/boldsign/route.ts — x-boldsign-signature HMAC-SHA256
 *   6. app/api/webhooks/takeoff/route.ts  — x-takeoff-signature HMAC-SHA256
 */

import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Shared mocks ────────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          abortSignal: vi.fn().mockResolvedValue({ error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        in: vi.fn(() => ({
          // takeoff_jobs query
          select: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  })),
  createUserClientSafe: vi.fn(),
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

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// web/leads route deps
vi.mock('@/lib/crm/division-router', () => ({
  routeToDivision: vi.fn().mockReturnValue('contracting'),
  resolveDivisionId: vi.fn().mockResolvedValue('div-uuid'),
}));

vi.mock('@/lib/crm/lead-assignment', () => ({
  assignLead: vi.fn().mockResolvedValue({ assigned: false }),
}));

// boldsign route deps
vi.mock('@/lib/esign/boldsign-client', () => ({
  BoldSignClient: vi.fn().mockImplementation(() => ({
    downloadDocument: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
    isMockMode: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

// erpnext route deps
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    set: vi.fn().mockResolvedValue('OK'),
  })),
}));

vi.mock('@/lib/erp/sync-service', () => ({
  SyncService: vi.fn().mockImplementation(() => ({
    readSalesInvoice: vi.fn().mockResolvedValue({}),
    readPurchaseInvoice: vi.fn().mockResolvedValue({}),
    syncPaymentEntry: vi.fn().mockResolvedValue({}),
    syncStockEntry: vi.fn().mockResolvedValue({}),
    syncEmployee: vi.fn().mockResolvedValue({}),
  })),
}));

// queue verify (used by cron-auth via verifyQStashSignature)
vi.mock('@/lib/queue/verify', () => ({
  verifyQStashSignature: vi.fn().mockResolvedValue({ valid: false, error: 'mock' }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method,
    headers,
    body,
  });
}

function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

const VALID_SECRET = 'super-secret-webhook-key-32chars!';
// A second secret of the SAME LENGTH but different content — triggers the timingSafeEqual path
const WRONG_SAME_LEN = VALID_SECRET.slice(0, -1) + (VALID_SECRET.endsWith('!') ? '@' : '!');
// A short secret — triggers the length mismatch early-exit path
const SHORT_SECRET = 'short';

// ─── 1. lib/api/cron-auth.ts — verifyCronAuth ────────────────────────────────

describe('cron-auth.ts — verifyCronAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('rejects mismatched-length Bearer token', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = makeReq('/api/cron/test', 'POST', {
      authorization: `Bearer ${SHORT_SECRET}`,
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(false);
  });

  it('rejects wrong-content Bearer token of correct length', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = makeReq('/api/cron/test', 'POST', {
      authorization: `Bearer ${WRONG_SAME_LEN}`,
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(false);
  });

  it('rejects missing authorization header', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = makeReq('/api/cron/test', 'POST', {});
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(false);
  });

  it('rejects when CRON_SECRET env var is not set', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('WEBHOOK_SIGNING_SECRET', '');
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = makeReq('/api/cron/test', 'POST', {
      authorization: `Bearer ${VALID_SECRET}`,
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(false);
  });

  it('authorizes a valid Bearer token', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { verifyCronAuth } = await import('@/lib/api/cron-auth');
    const req = makeReq('/api/cron/test', 'POST', {
      authorization: `Bearer ${VALID_SECRET}`,
    });
    const result = await verifyCronAuth(req);
    expect(result.authorized).toBe(true);
  });
});

// ─── 2. app/api/health/route.ts — ?deep=true cron gate ───────────────────────

describe('GET /api/health?deep=true — cron auth gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 401 when Bearer token length differs from CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { GET } = await import('@/app/api/health/route');
    const req = makeReq('/api/health?deep=true', 'GET', {
      authorization: `Bearer ${SHORT_SECRET}`,
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Bearer token has correct length but wrong content', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { GET } = await import('@/app/api/health/route');
    const req = makeReq('/api/health?deep=true', 'GET', {
      authorization: `Bearer ${WRONG_SAME_LEN}`,
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when authorization header is absent', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { GET } = await import('@/app/api/health/route');
    const req = makeReq('/api/health?deep=true', 'GET', {});
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('passes through when Bearer token is valid', async () => {
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
    const { GET } = await import('@/app/api/health/route');
    const req = makeReq('/api/health?deep=true', 'GET', {
      authorization: `Bearer ${VALID_SECRET}`,
    });
    const res = await GET(req);
    // Not 401 — deep check proceeds (may degrade depending on mocked deps)
    expect(res.status).not.toBe(401);
  });
});

// ─── 3. app/api/web/leads/route.ts — x-webhook-secret header ─────────────────

describe('POST /api/web/leads — x-webhook-secret timing protection', () => {
  const VALID_BODY = JSON.stringify({
    name: 'Test User',
    email: 'test@example.com',
    source: 'website_inbound',
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 401 when signature length differs from WEBHOOK_SIGNING_SECRET', async () => {
    vi.stubEnv('WEBHOOK_SIGNING_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/web/leads/route');
    const req = makeReq(
      '/api/web/leads',
      'POST',
      {
        'Content-Type': 'application/json',
        'x-webhook-secret': SHORT_SECRET,
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature has correct length but wrong content', async () => {
    vi.stubEnv('WEBHOOK_SIGNING_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/web/leads/route');
    const req = makeReq(
      '/api/web/leads',
      'POST',
      {
        'Content-Type': 'application/json',
        'x-webhook-secret': WRONG_SAME_LEN,
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when x-webhook-secret header is missing', async () => {
    vi.stubEnv('WEBHOOK_SIGNING_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/web/leads/route');
    const req = makeReq(
      '/api/web/leads',
      'POST',
      {
        'Content-Type': 'application/json',
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when WEBHOOK_SIGNING_SECRET env var is not set', async () => {
    vi.stubEnv('WEBHOOK_SIGNING_SECRET', '');
    const { POST } = await import('@/app/api/web/leads/route');
    const req = makeReq(
      '/api/web/leads',
      'POST',
      {
        'Content-Type': 'application/json',
        'x-webhook-secret': VALID_SECRET,
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─── 4. app/api/webhooks/erpnext/route.ts — x-webhook-secret header ──────────

describe('POST /api/webhooks/erpnext — x-webhook-secret timing protection', () => {
  const VALID_BODY = JSON.stringify({
    doctype: 'Customer',
    name: 'CUST-0001',
    event: 'on_update',
    modified: '2026-01-01 00:00:00',
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 401 when secret length differs from ERPNEXT_WEBHOOK_SECRET', async () => {
    vi.stubEnv('ERPNEXT_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/erpnext/route');
    const req = makeReq(
      '/api/webhooks/erpnext',
      'POST',
      {
        'Content-Type': 'application/json',
        'x-webhook-secret': SHORT_SECRET,
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when secret has correct length but wrong content', async () => {
    vi.stubEnv('ERPNEXT_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/erpnext/route');
    const req = makeReq(
      '/api/webhooks/erpnext',
      'POST',
      {
        'Content-Type': 'application/json',
        'x-webhook-secret': WRONG_SAME_LEN,
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when x-webhook-secret header is missing', async () => {
    vi.stubEnv('ERPNEXT_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/erpnext/route');
    const req = makeReq(
      '/api/webhooks/erpnext',
      'POST',
      {
        'Content-Type': 'application/json',
      },
      VALID_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 when ERPNEXT_WEBHOOK_SECRET env var is not set', async () => {
    vi.stubEnv('ERPNEXT_WEBHOOK_SECRET', '');
    const { POST } = await import('@/app/api/webhooks/erpnext/route');
    const req = makeReq(
      '/api/webhooks/erpnext',
      'POST',
      {
        'Content-Type': 'application/json',
        'x-webhook-secret': VALID_SECRET,
      },
      VALID_BODY,
    );
    const res = await POST(req);
    // Route returns 500 (misconfigured) when secret env is absent
    expect(res.status).toBe(500);
  });
});

// ─── 5. app/api/webhooks/boldsign/route.ts — HMAC-SHA256 signature ────────────

describe('POST /api/webhooks/boldsign — x-boldsign-signature HMAC timing protection', () => {
  const RAW_BODY = JSON.stringify({ documentId: 'doc-123', event: 'Completed' });

  function makeValidSig(secret: string, body: string): string {
    return hmacHex(secret, body);
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 401 when signature hex is shorter than expected HMAC', async () => {
    vi.stubEnv('BOLDSIGN_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/boldsign/route');
    const req = makeReq(
      '/api/webhooks/boldsign',
      'POST',
      {
        'x-boldsign-signature': 'deadbeef',
      },
      RAW_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature has correct length but wrong HMAC content', async () => {
    vi.stubEnv('BOLDSIGN_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/boldsign/route');
    // Same byte length as a real SHA256 hex (64 chars) but fabricated
    const wrongSig = 'a'.repeat(64);
    const req = makeReq(
      '/api/webhooks/boldsign',
      'POST',
      {
        'x-boldsign-signature': wrongSig,
      },
      RAW_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when x-boldsign-signature header is missing', async () => {
    vi.stubEnv('BOLDSIGN_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/boldsign/route');
    const req = makeReq('/api/webhooks/boldsign', 'POST', {}, RAW_BODY);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 503 in production when BOLDSIGN_WEBHOOK_SECRET is not set', async () => {
    vi.stubEnv('BOLDSIGN_WEBHOOK_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    const { POST } = await import('@/app/api/webhooks/boldsign/route');
    const validSig = makeValidSig(VALID_SECRET, RAW_BODY);
    const req = makeReq(
      '/api/webhooks/boldsign',
      'POST',
      {
        'x-boldsign-signature': validSig,
      },
      RAW_BODY,
    );
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('passes through with a valid HMAC signature', async () => {
    vi.stubEnv('BOLDSIGN_WEBHOOK_SECRET', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/boldsign/route');
    const validSig = makeValidSig(VALID_SECRET, RAW_BODY);
    const req = makeReq(
      '/api/webhooks/boldsign',
      'POST',
      {
        'x-boldsign-signature': validSig,
      },
      RAW_BODY,
    );
    const res = await POST(req);
    // Signature passes — may fail further (missing documentId handler, etc.) but not 401
    expect(res.status).not.toBe(401);
  });
});

// ─── 6. app/api/webhooks/takeoff/route.ts — HMAC-SHA256 signature ─────────────

describe('POST /api/webhooks/takeoff — x-takeoff-signature HMAC timing protection', () => {
  const VALID_PAYLOAD = JSON.stringify({ job_id: 'job-abc', status: 'completed' });

  function makeValidSig(secret: string, body: string): string {
    return hmacHex(secret, body);
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 500 when TAKEOFF_ENGINE_TOKEN env var is not set', async () => {
    vi.stubEnv('TAKEOFF_ENGINE_TOKEN', '');
    const { POST } = await import('@/app/api/webhooks/takeoff/route');
    const req = makeReq(
      '/api/webhooks/takeoff',
      'POST',
      {
        'x-takeoff-signature': makeValidSig(VALID_SECRET, VALID_PAYLOAD),
      },
      VALID_PAYLOAD,
    );
    const res = await POST(req);
    // Route returns 500 (misconfigured) when token env is absent
    expect(res.status).toBe(500);
  });

  it('returns 401 when signature hex is shorter than expected HMAC', async () => {
    vi.stubEnv('TAKEOFF_ENGINE_TOKEN', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/takeoff/route');
    const req = makeReq(
      '/api/webhooks/takeoff',
      'POST',
      {
        'x-takeoff-signature': 'deadbeef',
      },
      VALID_PAYLOAD,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature has correct length but wrong HMAC content', async () => {
    vi.stubEnv('TAKEOFF_ENGINE_TOKEN', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/takeoff/route');
    const wrongSig = 'b'.repeat(64); // SHA256 hex is always 64 chars
    const req = makeReq(
      '/api/webhooks/takeoff',
      'POST',
      {
        'x-takeoff-signature': wrongSig,
      },
      VALID_PAYLOAD,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when x-takeoff-signature header is missing', async () => {
    vi.stubEnv('TAKEOFF_ENGINE_TOKEN', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/takeoff/route');
    const req = makeReq('/api/webhooks/takeoff', 'POST', {}, VALID_PAYLOAD);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('passes through with a valid HMAC signature', async () => {
    vi.stubEnv('TAKEOFF_ENGINE_TOKEN', VALID_SECRET);
    const { POST } = await import('@/app/api/webhooks/takeoff/route');
    const validSig = makeValidSig(VALID_SECRET, VALID_PAYLOAD);
    const req = makeReq(
      '/api/webhooks/takeoff',
      'POST',
      {
        'x-takeoff-signature': validSig,
      },
      VALID_PAYLOAD,
    );
    const res = await POST(req);
    // Signature passes — may get 200 ok (no matching job) but not 401
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });
});
