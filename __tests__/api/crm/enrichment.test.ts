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

import { makeEnrichmentJob, makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/enrichment/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

describe('GET /api/crm/enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);
    const req = makeRequest('/api/crm/enrichment');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns paginated enrichment jobs', async () => {
    const jobs = [makeEnrichmentJob(), makeEnrichmentJob({ status: 'failed' })];
    const client = mockSupabaseClient({
      defaultResponse: { data: jobs, error: null, count: 2 },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body).toHaveProperty('hasMore');
  });

  it('filters by status query param', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: [makeEnrichmentJob({ status: 'pending' })], error: null, count: 1 },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment?status=pending');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('filters by source query param', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: [makeEnrichmentJob({ source: 'clearbit' })], error: null, count: 1 },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment?source=clearbit');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns 400 for invalid status', async () => {
    const req = makeRequest('/api/crm/enrichment?status=invalid_status');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('respects pagination params', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: [makeEnrichmentJob()], error: null, count: 50 },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment?limit=10&offset=20');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasMore).toBe(true);
  });

  it('returns 500 on supabase error', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: null, error: { message: 'DB error' }, count: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('returns empty array when no jobs exist', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: [], error: null, count: 0 },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});
