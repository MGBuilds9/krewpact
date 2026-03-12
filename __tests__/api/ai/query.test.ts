/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.AI_ENABLED = 'true';
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/ai/agents/nl-query', () => ({ executeNLQuery: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { executeNLQuery } from '@/lib/ai/agents/nl-query';
import { makeJsonRequest } from '../../helpers/mock-request';
import { POST } from '@/app/api/ai/query/route';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockExecuteNLQuery = vi.mocked(executeNLQuery);
const mockRateLimit = vi.mocked(rateLimit);
const mockRateLimitResponse = vi.mocked(rateLimitResponse);

function mockUserClient(orgId: string | null) {
  const chain: any = {};
  ['select', 'eq', 'single'].forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.then = (resolve: any) => resolve({ data: orgId ? { org_id: orgId } : null, error: null });
  return { client: { from: vi.fn().mockReturnValue(chain) }, error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' } as any);
  mockRateLimit.mockResolvedValue({ success: true } as any);
  mockRateLimitResponse.mockReturnValue(
    new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 }) as any,
  );
  mockCreateUserClientSafe.mockResolvedValue(mockUserClient('org-abc') as any);
  mockExecuteNLQuery.mockResolvedValue({
    answer: 'You have 5 active deals.',
    toolUsed: 'search_opportunities',
    data: [],
  });
});

describe('POST /api/ai/query', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as any);

    const res = await POST(makeJsonRequest('/api/ai/query', { query: 'Show me deals' }));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when query is too short (< 3 chars)', async () => {
    const res = await POST(makeJsonRequest('/api/ai/query', { query: 'hi' }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Invalid query');
  });

  it('returns 404 when org not found', async () => {
    mockCreateUserClientSafe.mockResolvedValueOnce(mockUserClient(null) as any);

    const res = await POST(makeJsonRequest('/api/ai/query', { query: 'Show pipeline status' }));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Organization not found');
  });

  it('returns success with AI answer', async () => {
    const res = await POST(makeJsonRequest('/api/ai/query', { query: 'Show me all deals' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.answer).toBe('You have 5 active deals.');
    expect(body.toolUsed).toBe('search_opportunities');
  });

  it('rate limits at 20 per minute', async () => {
    mockRateLimit.mockResolvedValueOnce({ success: false } as any);

    const res = await POST(makeJsonRequest('/api/ai/query', { query: 'Show me pipeline' }));
    expect(res.status).toBe(429);
    expect(mockRateLimitResponse).toHaveBeenCalled();
  });

  it('returns 500 when executeNLQuery throws', async () => {
    mockExecuteNLQuery.mockRejectedValueOnce(new Error('Gemini API timeout'));

    const res = await POST(makeJsonRequest('/api/ai/query', { query: 'What is our win rate?' }));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Query failed');
  });

  it('passes query, orgId, and userId to executeNLQuery', async () => {
    await POST(makeJsonRequest('/api/ai/query', { query: 'Show stalled deals' }));

    expect(mockExecuteNLQuery).toHaveBeenCalledWith({
      query: 'Show stalled deals',
      orgId: 'org-abc',
      userId: 'user-1',
    });
  });
});
