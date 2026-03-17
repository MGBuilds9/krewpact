import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeExpenseClaim,
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  TEST_IDS,
} from '@/__tests__/helpers';
import { GET, POST } from '@/app/api/expenses/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

describe('GET /api/expenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/expenses'));
    expect(res.status).toBe(401);
  });

  it('returns expense claims list', async () => {
    const expenses = [makeExpenseClaim(), makeExpenseClaim({ category: 'travel' })];

    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { expense_claims: { data: expenses, error: null } } }),
      error: null,
    });

    const res = await GET(makeRequest('/api/expenses'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual(expenses);
  });

  it('queries expense_claims table (not expenses)', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const client = mockSupabaseClient({
      tables: { expense_claims: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    await GET(makeRequest('/api/expenses'));
    expect(client.from).toHaveBeenCalledWith('expense_claims');
  });

  it('filters by status', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const client = mockSupabaseClient({
      tables: { expense_claims: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/expenses?status=submitted'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/expenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await POST(
      makeJsonRequest('/api/expenses', {
        amount: 100,
        category: 'materials',
        expense_date: '2026-02-10',
        user_id: TEST_IDS.USER_ID,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates expense claim with valid data', async () => {
    const created = makeExpenseClaim();

    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { expense_claims: { data: created, error: null } } }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/expenses', {
        amount: 250,
        category: 'materials',
        expense_date: '2026-02-10',
        user_id: TEST_IDS.USER_ID,
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for missing required fields', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await POST(
      makeJsonRequest('/api/expenses', {
        category: 'materials',
      }),
    );
    expect(res.status).toBe(400);
  });
});
