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

import { PATCH } from '@/app/api/ai/insights/[id]/act/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { mockClerkAuth, mockClerkUnauth } from '../../helpers/mock-auth';
import { makeRequest } from '../../helpers/mock-request';
import { mockSupabaseClient } from '../../helpers/mock-supabase';

const INSIGHT_ID = '550e8400-e29b-41d4-a716-446655440088';

describe('PATCH /api/ai/insights/[id]/act', () => {
  const mockAuth = vi.mocked(auth);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user_test_123');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest(`/api/ai/insights/${INSIGHT_ID}/act`, { method: 'PATCH' });
    const context = { params: Promise.resolve({ id: INSIGHT_ID }) };
    const res = await PATCH(req, context);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns success on valid act', async () => {
    const supabase = mockSupabaseClient({ tables: { ai_insights: { data: null, error: null } } });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(`/api/ai/insights/${INSIGHT_ID}/act`, { method: 'PATCH' });
    const context = { params: Promise.resolve({ id: INSIGHT_ID }) };
    const res = await PATCH(req, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('calls supabase update with acted_on_at and acted_on_by', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const supabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as any;
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(`/api/ai/insights/${INSIGHT_ID}/act`, { method: 'PATCH' });
    const context = { params: Promise.resolve({ id: INSIGHT_ID }) };
    await PATCH(req, context);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        acted_on_at: expect.any(String),
        acted_on_by: 'user_test_123',
      }),
    );
  });

  it('calls supabase update with the correct insight id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const supabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as any;
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(`/api/ai/insights/${INSIGHT_ID}/act`, { method: 'PATCH' });
    const context = { params: Promise.resolve({ id: INSIGHT_ID }) };
    await PATCH(req, context);

    expect(mockEq).toHaveBeenCalledWith('id', INSIGHT_ID);
  });

  it('returns 500 on supabase update error', async () => {
    const supabase = mockSupabaseClient({
      tables: { ai_insights: { data: null, error: { message: 'Update failed' } } },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(`/api/ai/insights/${INSIGHT_ID}/act`, { method: 'PATCH' });
    const context = { params: Promise.resolve({ id: INSIGHT_ID }) };
    const res = await PATCH(req, context);
    expect(res.status).toBe(500);
  });
});
