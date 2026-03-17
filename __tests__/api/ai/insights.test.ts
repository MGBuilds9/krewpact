import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/ai/insights/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { mockClerkAuth, mockClerkUnauth } from '../../helpers/mock-auth';
import { makeRequest } from '../../helpers/mock-request';
import { mockSupabaseClient } from '../../helpers/mock-supabase';

describe('GET /api/ai/insights', () => {
  const mockAuth = vi.mocked(auth);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user_test_123');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest(
      '/api/ai/insights?entity_type=lead&entity_id=550e8400-e29b-41d4-a716-446655440000',
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when entity_type is missing', async () => {
    const req = makeRequest('/api/ai/insights?entity_id=550e8400-e29b-41d4-a716-446655440000');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when entity_id is missing', async () => {
    const req = makeRequest('/api/ai/insights?entity_type=lead');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when entity_id is not a valid UUID', async () => {
    const req = makeRequest('/api/ai/insights?entity_type=lead&entity_id=not-a-uuid');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when entity_type is not an allowed value', async () => {
    const req = makeRequest(
      '/api/ai/insights?entity_type=contract&entity_id=550e8400-e29b-41d4-a716-446655440000',
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns insights list on success', async () => {
    const insights = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        insight_type: 'stale_deal',
        title: 'Deal going stale',
        content: 'No activity in 14 days',
        confidence: 0.85,
        action_url: '/crm/leads/123',
        action_label: 'View Lead',
        metadata: {},
        created_at: '2026-03-12T00:00:00Z',
      },
    ];
    const supabase = mockSupabaseClient({
      tables: { ai_insights: { data: insights, error: null } },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(
      '/api/ai/insights?entity_type=lead&entity_id=550e8400-e29b-41d4-a716-446655440000',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toHaveLength(1);
    expect(body.insights[0].insight_type).toBe('stale_deal');
  });

  it('returns empty array when no insights exist', async () => {
    const supabase = mockSupabaseClient({ tables: { ai_insights: { data: [], error: null } } });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(
      '/api/ai/insights?entity_type=project&entity_id=550e8400-e29b-41d4-a716-446655440000',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toEqual([]);
  });

  it('returns 500 on supabase query error', async () => {
    const supabase = mockSupabaseClient({
      tables: { ai_insights: { data: null, error: { message: 'DB error' } } },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(
      '/api/ai/insights?entity_type=lead&entity_id=550e8400-e29b-41d4-a716-446655440000',
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
