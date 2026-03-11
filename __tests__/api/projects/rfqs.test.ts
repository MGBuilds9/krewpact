/**
 * Tests for /api/projects/[id]/rfqs (GET list, POST create).
 *
 * Covers: auth, pagination, status filter, creation, validation, DB errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/projects/[id]/rfqs/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleRfq = {
  id: 'rfq-1',
  project_id: 'proj-1',
  rfq_number: 'RFQ-001',
  title: 'Mechanical HVAC package',
  scope_summary: 'Full HVAC install for floors 1-3',
  due_at: '2026-03-25',
  status: 'draft',
  created_by: 'user_test_123',
  created_at: '2026-03-05T10:00:00Z',
  updated_at: '2026-03-05T10:00:00Z',
};

describe('GET /api/projects/[id]/rfqs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/proj-1/rfqs'), makeContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns paginated RFQ list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfq_packages: { data: [sampleRfq], error: null } } }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/rfqs'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].rfq_number).toBe('RFQ-001');
  });

  it('filters by status', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { rfq_packages: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/projects/proj-1/rfqs?status=issued'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('rfq_packages');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { rfq_packages: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/rfqs'), makeContext('proj-1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/rfqs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/rfqs', { title: 'Test' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates an RFQ package', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfq_packages: { data: sampleRfq, error: null } } }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/rfqs', {
        rfq_number: 'RFQ-001',
        title: 'Mechanical HVAC package',
        scope_summary: 'Full HVAC install for floors 1-3',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rfq_number).toBe('RFQ-001');
  });

  it('returns 400 for missing required fields', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/rfqs', { scope_summary: 'Missing title and number' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });
});
