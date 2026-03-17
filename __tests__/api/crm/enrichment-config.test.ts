import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { GET, PATCH } from '@/app/api/crm/enrichment/config/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const DEFAULT_CONFIG = {
  sources: [
    { name: 'apollo', enabled: true, order: 1 },
    { name: 'clearbit', enabled: false, order: 2 },
    { name: 'linkedin', enabled: false, order: 3 },
    { name: 'google', enabled: false, order: 4 },
  ],
};

describe('GET /api/crm/enrichment/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);
    const req = makeRequest('/api/crm/enrichment/config');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns default config when no row exists', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: null, error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment/config');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(DEFAULT_CONFIG);
  });

  it('returns stored config when row exists', async () => {
    const storedConfig = {
      sources: [
        { name: 'apollo', enabled: true, order: 1 },
        { name: 'clearbit', enabled: true, order: 2 },
      ],
    };
    const client = mockSupabaseClient({
      defaultResponse: { data: { value: storedConfig }, error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment/config');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(storedConfig);
  });

  it('returns 500 on supabase error', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: null, error: { message: 'DB error' } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment/config');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/crm/enrichment/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);
    const req = makeJsonRequest('/api/crm/enrichment/config', DEFAULT_CONFIG, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('updates config successfully', async () => {
    const updatedConfig = {
      sources: [
        { name: 'clearbit', enabled: true, order: 1 },
        { name: 'apollo', enabled: true, order: 2 },
      ],
    };
    const client = mockSupabaseClient({
      defaultResponse: { data: { value: updatedConfig }, error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeJsonRequest('/api/crm/enrichment/config', updatedConfig, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updatedConfig);
  });

  it('returns 400 for invalid body — missing sources', async () => {
    const req = makeJsonRequest('/api/crm/enrichment/config', { sources: [] }, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid body — bad source shape', async () => {
    const req = makeJsonRequest(
      '/api/crm/enrichment/config',
      { sources: [{ name: '', enabled: 'yes', order: 0 }] },
      'PATCH',
    );
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest('/api/crm/enrichment/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 on supabase error', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: null, error: { message: 'Upsert failed' } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeJsonRequest('/api/crm/enrichment/config', DEFAULT_CONFIG, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});
