import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
  createUserClient: vi.fn(),
}));

// Mock BoldSign client
vi.mock('@/lib/esign/boldsign-client', () => ({
  BoldSignClient: vi.fn().mockImplementation(() => ({
    downloadDocument: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
    isMockMode: vi.fn().mockReturnValue(true),
  })),
}));

// Mock notification dispatcher
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Sentry (imported by logger)
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/webhooks/boldsign/route';
import { NextRequest } from 'next/server';

const WEBHOOK_SECRET = 'test-webhook-secret-12345';
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeSignature(body: string, secret: string = WEBHOOK_SECRET): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return hmac.digest('hex');
}

function makeWebhookRequest(body: Record<string, unknown>, secret?: string): NextRequest {
  const rawBody = JSON.stringify(body);
  const signature = makeSignature(rawBody, secret ?? WEBHOOK_SECRET);
  return new NextRequest(new URL('http://localhost/api/webhooks/boldsign'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-boldsign-signature': signature,
    },
    body: rawBody,
  });
}

function makeMockSupabase() {
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'env-1', contract_id: 'contract-1' },
      error: null,
    }),
    then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null })),
  };

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'env-1', contract_id: 'contract-1' },
      error: null,
    }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      resolve({ data: { id: 'env-1', contract_id: 'contract-1' }, error: null }),
    ),
  };

  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'doc-1' }, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null })),
  };

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'esign_envelopes') {
        return {
          update: vi.fn().mockReturnValue(updateChain),
          select: vi.fn().mockReturnValue(selectChain),
          insert: vi.fn().mockReturnValue(insertChain),
        };
      }
      if (table === 'esign_documents') {
        return {
          insert: vi.fn().mockReturnValue(insertChain),
        };
      }
      if (table === 'contract_terms') {
        return {
          update: vi.fn().mockReturnValue(updateChain),
        };
      }
      return {
        update: vi.fn().mockReturnValue(updateChain),
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue(insertChain),
      };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };

  return client;
}

describe('POST /api/webhooks/boldsign', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.BOLDSIGN_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const mockSupabase = makeMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  // ============================================================
  // Auth / signature verification
  // ============================================================

  it('returns 500 when BOLDSIGN_WEBHOOK_SECRET is not set', async () => {
    delete process.env.BOLDSIGN_WEBHOOK_SECRET;

    const req = makeWebhookRequest({ event: 'Completed', documentId: 'doc-1' });
    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toContain('not configured');
  });

  it('returns 401 when signature is missing', async () => {
    const body = JSON.stringify({ event: 'Completed', documentId: 'doc-1' });
    const req = new NextRequest(new URL('http://localhost/api/webhooks/boldsign'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature is wrong', async () => {
    const body = { event: 'Completed', documentId: 'doc-1' };
    const _req = makeWebhookRequest(body, 'wrong-secret');
    // Override the signature with one computed using the wrong secret
    const rawBody = JSON.stringify(body);
    const wrongSig = makeSignature(rawBody, 'wrong-secret');

    const req2 = new NextRequest(new URL('http://localhost/api/webhooks/boldsign'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-boldsign-signature': wrongSig,
      },
      body: rawBody,
    });

    const res = await POST(req2);
    expect(res.status).toBe(401);
  });

  it('returns 400 when documentId is missing', async () => {
    const req = makeWebhookRequest({ event: 'Completed' });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('documentId');
  });

  // ============================================================
  // Completed event
  // ============================================================

  it('handles Completed event — updates envelope to completed', async () => {
    const req = makeWebhookRequest({
      event: 'Completed',
      documentId: 'doc-completed-1',
      status: 'Completed',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);

    // Verify service client was called (meaning DB ops were attempted)
    expect(mockCreateServiceClient).toHaveBeenCalled();
  });

  // ============================================================
  // Declined event
  // ============================================================

  it('handles Declined event — updates envelope to declined', async () => {
    const req = makeWebhookRequest({
      event: 'Declined',
      documentId: 'doc-declined-1',
      status: 'Declined',
      signerDetails: [
        {
          signerEmail: 'signer@test.com',
          signerName: 'Test Signer',
          status: 'Declined',
          declineReason: 'Terms not acceptable',
        },
      ],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);

    expect(mockCreateServiceClient).toHaveBeenCalled();
  });

  // ============================================================
  // Expired event
  // ============================================================

  it('handles Expired event — updates envelope to expired', async () => {
    const req = makeWebhookRequest({
      event: 'Expired',
      documentId: 'doc-expired-1',
      status: 'Expired',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);

    expect(mockCreateServiceClient).toHaveBeenCalled();
  });

  // ============================================================
  // Generic/unknown events
  // ============================================================

  it('handles unknown events gracefully', async () => {
    const req = makeWebhookRequest({
      event: 'SomeNewEvent',
      documentId: 'doc-unknown-1',
      status: 'InProgress',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);
  });

  // ============================================================
  // Valid signature accepted
  // ============================================================

  it('accepts valid HMAC signature', async () => {
    const req = makeWebhookRequest({
      event: 'Sent',
      documentId: 'doc-valid-sig',
      status: 'Sent',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // ============================================================
  // Always returns 200 even on internal errors
  // ============================================================

  it('returns 200 even when DB update fails (prevents webhook retry)', async () => {
    const failSupabase = makeMockSupabase();
    // Make the update fail
    failSupabase.from = vi.fn().mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: (v: unknown) => void) =>
          resolve({ data: null, error: { message: 'DB error' } }),
        ),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      }),
    }));
    mockCreateServiceClient.mockReturnValue(failSupabase as never);

    const req = makeWebhookRequest({
      event: 'Expired',
      documentId: 'doc-db-fail',
      status: 'Expired',
    });

    const res = await POST(req);
    // Should still return 200 to prevent BoldSign from retrying
    expect(res.status).toBe(200);
  });
});
