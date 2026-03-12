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
import { GET } from '@/app/api/crm/sequences/analytics/route';
import { makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function mockChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = handler;
  chain.eq = handler;
  chain.in = handler;
  chain.order = handler;
  chain.limit = handler;
  chain.range = handler;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function req(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `/api/crm/sequences/analytics?${qs}` : '/api/crm/sequences/analytics';
  return makeRequest(path);
}

describe('GET /api/crm/sequences/analytics', () => {
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    from = vi.fn();
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);

    const res = await GET(req());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns analytics with correct enrollment counts', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    from.mockImplementation((table: string) => {
      if (table === 'sequences') {
        return mockChain({
          data: [
            {
              id: 'seq-1',
              name: 'Welcome',
              is_active: true,
              sequence_steps: [{ id: 's1' }, { id: 's2' }],
            },
            { id: 'seq-2', name: 'Follow Up', is_active: false, sequence_steps: [{ id: 's3' }] },
          ],
          error: null,
        });
      }
      if (table === 'sequence_enrollments') {
        return mockChain({
          data: [
            { sequence_id: 'seq-1', status: 'active' },
            { sequence_id: 'seq-1', status: 'active' },
            { sequence_id: 'seq-1', status: 'completed' },
            { sequence_id: 'seq-1', status: 'paused' },
            { sequence_id: 'seq-2', status: 'failed' },
            { sequence_id: 'seq-2', status: 'completed' },
          ],
          error: null,
        });
      }
      return mockChain({ data: null, error: null });
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);

    const seq1 = body.data.find((s: { sequence_id: string }) => s.sequence_id === 'seq-1');
    expect(seq1).toEqual({
      sequence_id: 'seq-1',
      sequence_name: 'Welcome',
      is_active: true,
      total_steps: 2,
      enrollments: { active: 2, completed: 1, paused: 1, failed: 0, total: 4 },
    });

    const seq2 = body.data.find((s: { sequence_id: string }) => s.sequence_id === 'seq-2');
    expect(seq2).toEqual({
      sequence_id: 'seq-2',
      sequence_name: 'Follow Up',
      is_active: false,
      total_steps: 1,
      enrollments: { active: 0, completed: 1, paused: 0, failed: 1, total: 2 },
    });
  });

  it('returns empty array when no sequences exist', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    from.mockImplementation((table: string) => {
      if (table === 'sequences') {
        return mockChain({ data: [], error: null });
      }
      return mockChain({ data: null, error: null });
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    // Should not query enrollments when there are no sequences
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('sequences');
  });

  it('filters by divisionId when provided', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    const eqCalls: [string, string][] = [];
    const seqChain: Record<string, unknown> = {};
    const seqHandler = () => seqChain;
    seqChain.select = seqHandler;
    seqChain.order = seqHandler;
    seqChain.limit = seqHandler;
    seqChain.range = seqHandler;
    seqChain.in = seqHandler;
    seqChain.eq = (col: string, val: string) => {
      eqCalls.push([col, val]);
      return seqChain;
    };
    seqChain.then = (resolve: (v: unknown) => void) =>
      resolve({
        data: [{ id: 'seq-1', name: 'Div Seq', is_active: true, sequence_steps: [] }],
        error: null,
      });

    from.mockImplementation((table: string) => {
      if (table === 'sequences') return seqChain;
      if (table === 'sequence_enrollments') {
        return mockChain({ data: [], error: null });
      }
      return mockChain({ data: null, error: null });
    });

    const res = await GET(req({ divisionId: 'div-abc' }));
    expect(res.status).toBe(200);
    expect(eqCalls).toContainEqual(['division_id', 'div-abc']);
  });

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);

    from.mockImplementation((table: string) => {
      if (table === 'sequences') {
        return mockChain({ data: null, error: { message: 'Connection refused' } });
      }
      return mockChain({ data: null, error: null });
    });

    const res = await GET(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Connection refused');
  });
});
