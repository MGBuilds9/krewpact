import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/leads/[id]/stage/route';
import { mockSupabaseClient, makeJsonRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const LEAD_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';

function makeCtx(id = LEAD_ID) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/crm/leads/[id]/stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'contacted' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth client fails', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: null,
      error: NextResponse.json({ error: 'Auth failed' }, { status: 401 }),
    });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'contacted' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    const supabase = mockSupabaseClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = new Request('http://localhost/api/crm/leads/' + LEAD_ID + '/stage', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as unknown as import('next/server').NextRequest, makeCtx());
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status value', async () => {
    const supabase = mockSupabaseClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'invalid_stage' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it('returns 404 when lead not found', async () => {
    const supabase = mockSupabaseClient();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      }),
    } as unknown as ReturnType<typeof supabase.from>);
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'contacted' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid stage transition (won → contacted)', async () => {
    const supabase = mockSupabaseClient();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: LEAD_ID, status: 'won' },
        error: null,
      }),
    } as unknown as ReturnType<typeof supabase.from>);
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'contacted' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/terminal/i);
  });

  it('returns 400 for same-stage transition', async () => {
    const supabase = mockSupabaseClient();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: LEAD_ID, status: 'new' },
        error: null,
      }),
    } as unknown as ReturnType<typeof supabase.from>);
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'new' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already in stage/i);
  });

  it('succeeds for valid transition (new → contacted)', async () => {
    const updatedLead = { id: LEAD_ID, status: 'contacted' };
    const supabase = mockSupabaseClient();
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: fetch current lead
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: LEAD_ID, status: 'new' }, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (callCount === 2) {
        // Second call: update lead
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedLead, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      // Third call: insert stage history (non-blocking)
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<typeof supabase.from>;
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'contacted' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('contacted');
  });

  it('succeeds for valid transition with lost_reason (new → lost)', async () => {
    const updatedLead = { id: LEAD_ID, status: 'lost', lost_reason: 'Budget constraints' };
    const supabase = mockSupabaseClient();
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: LEAD_ID, status: 'new' }, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (callCount === 2) {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedLead, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<typeof supabase.from>;
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });
    const req = makeJsonRequest(`/api/crm/leads/${LEAD_ID}/stage`, { status: 'lost', lost_reason: 'Budget constraints' });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lost_reason).toBe('Budget constraints');
  });
});
