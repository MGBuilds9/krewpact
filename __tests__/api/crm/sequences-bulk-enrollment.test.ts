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

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest } from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/sequences/enrollments/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const SEQUENCE_ID = 'a0000000-0000-4000-8000-000000000001';
const LEAD_1 = 'b0000000-0000-4000-8000-000000000001';
const LEAD_2 = 'b0000000-0000-4000-8000-000000000002';

function makeRequest(body: Record<string, unknown>) {
  return makeJsonRequest('/api/crm/sequences/enrollments', body, 'POST');
}

/**
 * Build a Supabase `from` mock that dispatches based on table name.
 * The route calls:
 *   Promise.all([sequences.maybeSingle(), sequence_steps.maybeSingle()])
 *   sequence_enrollments.in(...).in(...) -> existing check
 *   sequence_enrollments.insert(rows)
 */
function buildFromMock(config: {
  sequence: { data: unknown; error: unknown };
  step: { data: unknown; error: unknown };
  existing: { data: unknown; error: unknown };
  insertError?: unknown;
}) {
  const makeReadChain = (result: { data: unknown; error: unknown }) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.in = self;
    chain.order = self;
    chain.limit = self;
    chain.maybeSingle = () => result;
    chain.then = (resolve: (v: unknown) => void) => resolve(result);
    return chain;
  };

  const insertResult = { error: config.insertError ?? null };
  // Make insertResult awaitable
  const awaitableInsert = {
    ...insertResult,
    then: (resolve: (v: unknown) => void) => resolve(insertResult),
  };

  let enrollmentCallCount = 0;

  return vi.fn((table: string) => {
    if (table === 'sequences') return makeReadChain(config.sequence);
    if (table === 'sequence_steps') return makeReadChain(config.step);
    if (table === 'sequence_enrollments') {
      enrollmentCallCount += 1;
      if (enrollmentCallCount === 1) {
        // existing check — supports .select().eq().in().in()
        return makeReadChain(config.existing);
      }
      // insert call — route does: await supabase.from('sequence_enrollments').insert(rows)
      return { insert: () => awaitableInsert };
    }
    return makeReadChain({ data: null, error: null });
  });
}

describe('POST /api/crm/sequences/enrollments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: [LEAD_1] }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid body (missing sequence_id)', async () => {
    mockCreateUserClientSafe.mockResolvedValue({ client: { from: vi.fn() } as never, error: null });

    const res = await POST(makeRequest({ lead_ids: [LEAD_1] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-UUID lead_ids', async () => {
    mockCreateUserClientSafe.mockResolvedValue({ client: { from: vi.fn() } as never, error: null });

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: ['not-a-uuid'] }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when sequence not found or inactive', async () => {
    const from = buildFromMock({
      sequence: { data: null, error: null },
      step: { data: null, error: null },
      existing: { data: [], error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: [LEAD_1] }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('enrolls leads that are not already enrolled', async () => {
    const from = buildFromMock({
      sequence: { data: { id: SEQUENCE_ID }, error: null },
      step: { data: { step_number: 1, delay_days: 0, delay_hours: 0 }, error: null },
      existing: { data: [], error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: [LEAD_1, LEAD_2] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrolled).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.errors).toEqual([]);
  });

  it('skips leads already enrolled in the sequence', async () => {
    const from = buildFromMock({
      sequence: { data: { id: SEQUENCE_ID }, error: null },
      step: { data: { step_number: 1, delay_days: 0, delay_hours: 0 }, error: null },
      existing: { data: [{ lead_id: LEAD_1 }], error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: [LEAD_1, LEAD_2] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrolled).toBe(1);
    expect(body.skipped).toBe(1);
  });

  it('returns enrolled:0 skipped:N when all leads already enrolled', async () => {
    const from = buildFromMock({
      sequence: { data: { id: SEQUENCE_ID }, error: null },
      step: { data: { step_number: 1, delay_days: 0, delay_hours: 0 }, error: null },
      existing: { data: [{ lead_id: LEAD_1 }, { lead_id: LEAD_2 }], error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: [LEAD_1, LEAD_2] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrolled).toBe(0);
    expect(body.skipped).toBe(2);
  });

  it('returns 500 when insert fails', async () => {
    const from = buildFromMock({
      sequence: { data: { id: SEQUENCE_ID }, error: null },
      step: { data: { step_number: 1, delay_days: 0, delay_hours: 0 }, error: null },
      existing: { data: [], error: null },
      insertError: { message: 'DB write error' },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: { from } as never, error: null });

    const res = await POST(makeRequest({ sequence_id: SEQUENCE_ID, lead_ids: [LEAD_1] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB write error');
  });
});
