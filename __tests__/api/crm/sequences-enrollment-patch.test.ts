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

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { PATCH } from '@/app/api/crm/sequences/enrollments/[enrollmentId]/route';
import { makeJsonRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function mockChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = handler;
  chain.eq = handler;
  chain.update = handler;
  chain.single = handler;
  chain.in = handler;
  chain.order = handler;
  chain.limit = handler;
  chain.range = handler;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function patchRequest(body: Record<string, unknown>) {
  return makeJsonRequest('/api/crm/sequences/enrollments/enroll-1', body, 'PATCH');
}

function makeContext(enrollmentId = 'enroll-1') {
  return { params: Promise.resolve({ enrollmentId }) };
}

describe('PATCH /api/crm/sequences/enrollments/[enrollmentId]', () => {
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    from = vi.fn();
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);

    const res = await PATCH(patchRequest({ action: 'pause' }), makeContext());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid action', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    const res = await PATCH(patchRequest({ action: 'cancel' }), makeContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('pauses an active enrollment', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    const updatedEnrollment = {
      id: 'enroll-1',
      sequence_id: 'seq-1',
      status: 'paused',
      paused_at: '2026-03-05T12:00:00.000Z',
    };

    from.mockReturnValue(mockChain({ data: updatedEnrollment, error: null }));

    const res = await PATCH(patchRequest({ action: 'pause' }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('enroll-1');
    expect(body.status).toBe('paused');
    expect(body.paused_at).toBeDefined();
    expect(from).toHaveBeenCalledWith('sequence_enrollments');
  });

  it('resumes a paused enrollment', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    const updatedEnrollment = {
      id: 'enroll-1',
      sequence_id: 'seq-1',
      status: 'active',
      paused_at: null,
    };

    from.mockReturnValue(mockChain({ data: updatedEnrollment, error: null }));

    const res = await PATCH(patchRequest({ action: 'resume' }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('enroll-1');
    expect(body.status).toBe('active');
    expect(body.paused_at).toBeNull();
    expect(from).toHaveBeenCalledWith('sequence_enrollments');
  });

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    from.mockReturnValue(mockChain({ data: null, error: { message: 'Row not found' } }));

    const res = await PATCH(patchRequest({ action: 'pause' }), makeContext());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Row not found');
  });
});
