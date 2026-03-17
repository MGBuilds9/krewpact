/**
 * Tests for /api/projects/[id]/submittals (GET list, POST create).
 *
 * Covers: auth, pagination, status filter, creation, validation, DB errors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET, POST } from '@/app/api/projects/[id]/submittals/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleSubmittal = {
  id: 'sub-1',
  project_id: 'proj-1',
  submittal_number: 'SUB-001',
  title: 'Concrete mix design',
  status: 'draft',
  due_at: '2026-03-20',
  submitted_by: 'user_test_123',
  submitted_at: null,
  created_at: '2026-03-05T10:00:00Z',
  updated_at: '2026-03-05T10:00:00Z',
};

describe('GET /api/projects/[id]/submittals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/proj-1/submittals'), makeContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns paginated submittal list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittals: { data: [sampleSubmittal], error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/submittals'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].submittal_number).toBe('SUB-001');
  });

  it('filters by status', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { submittals: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals?status=approved'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('submittals');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittals: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/submittals'), makeContext('proj-1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/submittals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals', { title: 'Test' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates a submittal', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittals: { data: sampleSubmittal, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals', {
        submittal_number: 'SUB-001',
        title: 'Concrete mix design',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.submittal_number).toBe('SUB-001');
  });

  it('returns 400 for missing required fields', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals', { title: 'No number' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });
});
