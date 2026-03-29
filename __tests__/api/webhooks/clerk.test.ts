import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { DEFAULT_ORG_ID: 'test-org-00000000-0000-0000-0000-000000000000' },
}));

// Mock Clerk auth (required by withApiRoute import even though auth: 'public' skips calling it)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// svix mock — must be hoisted so the route module sees it on import
const mockVerify = vi.fn();
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({ verify: mockVerify })),
}));

// Must mock next/headers before importing the route
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { Webhook } from 'svix';

import { POST } from '@/app/api/webhooks/clerk/route';
import { createServiceClient } from '@/lib/supabase/server';

const mockHeaders = vi.mocked(headers);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const MockWebhookCtor = vi.mocked(Webhook);

const WEBHOOK_SECRET = 'whsec_test-clerk-webhook-secret';

function makeHeadersMap(overrides: Record<string, string> = {}) {
  const map: Record<string, string> = {
    'svix-id': 'msg_test_id',
    'svix-timestamp': String(Math.floor(Date.now() / 1000)),
    'svix-signature': 'v1,test-signature',
    ...overrides,
  };
  return { get: (key: string) => map[key] ?? null };
}

function makeClerkRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL('http://localhost/api/webhooks/clerk'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeMockSupabase() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null })),
  };
  chain.from = vi.fn().mockReturnValue(chain);
  return chain;
}

const TEST_USER_CREATED = {
  type: 'user.created',
  data: {
    id: 'user_test123',
    email_addresses: [{ email_address: 'test@example.com' }],
    first_name: 'Test',
    last_name: 'User',
    image_url: 'https://example.com/avatar.jpg',
    public_metadata: {},
  },
};

const TEST_USER_UPDATED = {
  type: 'user.updated',
  data: {
    id: 'user_test123',
    email_addresses: [{ email_address: 'updated@example.com' }],
    first_name: 'Updated',
    last_name: 'Name',
    image_url: null,
    public_metadata: {},
  },
};

const TEST_USER_DELETED = {
  type: 'user.deleted',
  data: {
    id: 'user_test123',
    email_addresses: [],
    first_name: null,
    last_name: null,
    image_url: null,
    public_metadata: {},
  },
};

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = WEBHOOK_SECRET;
    mockHeaders.mockResolvedValue(makeHeadersMap() as never);
    // Restore Webhook constructor mock (clearAllMocks resets it)
    MockWebhookCtor.mockImplementation(function () {
      return { verify: mockVerify };
    });
    // Default: svix verify returns the parsed event body (success path)
    mockVerify.mockImplementation((body: string) => JSON.parse(body));
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  // ── Auth / signature ────────────────────────────────────────────

  it('returns 500 when CLERK_WEBHOOK_SECRET is not set', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;

    const res = await POST(makeClerkRequest(TEST_USER_CREATED));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/CLERK_WEBHOOK_SECRET/);
  });

  it('returns 400 when svix headers are missing', async () => {
    mockHeaders.mockResolvedValue({ get: () => null } as never);

    const res = await POST(makeClerkRequest(TEST_USER_CREATED));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing svix headers/);
  });

  it('returns 400 when svix signature verification fails', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeClerkRequest(TEST_USER_CREATED));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid webhook signature/);
  });

  // ── user.created ────────────────────────────────────────────────

  it('handles user.created — calls ensure_clerk_user RPC', async () => {
    const mockSupabase = makeMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    const res = await POST(makeClerkRequest(TEST_USER_CREATED));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'ensure_clerk_user',
      expect.objectContaining({
        p_clerk_id: 'user_test123',
        p_email: 'test@example.com',
      }),
    );
  });

  it('returns 500 when ensure_clerk_user RPC fails on user.created', async () => {
    const mockSupabase = makeMockSupabase();
    mockSupabase.rpc = vi.fn().mockResolvedValue({ error: { message: 'RPC failed' } });
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    const res = await POST(makeClerkRequest(TEST_USER_CREATED));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('RPC failed');
  });

  it('links portal account when krewpact_user_id is in public_metadata on user.created', async () => {
    const mockSupabase = makeMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    const eventWithMeta = {
      ...TEST_USER_CREATED,
      data: { ...TEST_USER_CREATED.data, public_metadata: { krewpact_user_id: 'portal-acc-1' } },
    };

    const res = await POST(makeClerkRequest(eventWithMeta));
    expect(res.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('portal_accounts');
  });

  // ── user.updated ────────────────────────────────────────────────

  it('handles user.updated — calls ensure_clerk_user RPC', async () => {
    const mockSupabase = makeMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    const res = await POST(makeClerkRequest(TEST_USER_UPDATED));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'ensure_clerk_user',
      expect.objectContaining({
        p_clerk_id: 'user_test123',
        p_email: 'updated@example.com',
      }),
    );
  });

  // ── user.deleted ────────────────────────────────────────────────

  it('handles user.deleted — archives user record', async () => {
    const mockSupabase = makeMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    const res = await POST(makeClerkRequest(TEST_USER_DELETED));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
  });

  it('returns 500 when user.deleted DB update fails', async () => {
    const mockSupabase = makeMockSupabase();
    // update chain resolves with error
    mockSupabase.then = vi.fn((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: 'archive failed' } }),
    );
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    // The route calls .from('users').update(...).eq(...) which resolves via .then()
    // Override from to return a chain that resolves with an error for users table
    const errChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'archive failed' } }),
    };
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') return errChain;
      return mockSupabase;
    });

    const res = await POST(makeClerkRequest(TEST_USER_DELETED));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('archive failed');
  });

  // ── Unknown event type ──────────────────────────────────────────

  it('returns 200 for unrecognized event types without calling DB', async () => {
    const mockSupabase = makeMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupabase as never);

    const unknownEvent = { type: 'session.created', data: { id: 'sess_1' } };
    const res = await POST(makeClerkRequest(unknownEvent));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });
});
