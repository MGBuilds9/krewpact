/**
 * Tests for /api/projects/[id]/submittals/[subId]/distribution (GET, POST).
 *
 * Covers: auth, entity verification, validation, retrieval, creation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/services/document-control', () => ({
  getDistributionLog: vi.fn(),
  createDistributionLog: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET, POST } from '@/app/api/projects/[id]/submittals/[subId]/distribution/route';
import { createDistributionLog, getDistributionLog } from '@/lib/services/document-control';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockGetDistributionLog = vi.mocked(getDistributionLog);
const mockCreateDistributionLog = vi.mocked(createDistributionLog);

function makeContext(id: string, subId: string) {
  return { params: Promise.resolve({ id, subId }) };
}

const sampleSub = { id: 'sub-1' };
const sampleLogEntry = {
  id: 'dist-1',
  submittal_id: 'sub-1',
  recipient_user_id: '550e8400-e29b-41d4-a716-446655440000',
  recipient_email: 'engineer@firm.com',
  recipient_name: 'Alex Engineer',
  status: 'sent' as const,
  sent_at: '2026-03-10T10:00:00Z',
  acknowledged_at: null,
  created_at: '2026-03-10T10:00:00Z',
};

const validRecipients = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'engineer@firm.com',
    name: 'Alex Engineer',
  },
];

/* ─── GET ─── */
describe('GET /api/projects/[id]/submittals/[subId]/distribution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/sub-1/distribution'),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when submittal not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittals: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/bad-sub/distribution'),
      makeContext('proj-1', 'bad-sub'),
    );
    expect(res.status).toBe(404);
  });

  it('returns distribution log entries', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { submittals: { data: sampleSub, error: null } } }),
      error: null,
    });
    mockGetDistributionLog.mockResolvedValue([sampleLogEntry]);

    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/sub-1/distribution'),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].recipient_email).toBe('engineer@firm.com');
    expect(body.total).toBe(1);
  });

  it('returns empty list when no distributions', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { submittals: { data: sampleSub, error: null } } }),
      error: null,
    });
    mockGetDistributionLog.mockResolvedValue([]);

    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/sub-1/distribution'),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});

/* ─── POST ─── */
describe('POST /api/projects/[id]/submittals/[subId]/distribution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals/sub-1/distribution', {
        recipients: validRecipients,
      }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty recipients array', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals/sub-1/distribution', { recipients: [] }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid recipient (bad email)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals/sub-1/distribution', {
        recipients: [
          { user_id: '550e8400-e29b-41d4-a716-446655440000', email: 'not-an-email', name: 'Test' },
        ],
      }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/submittals/sub-1/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(400);
  });

  it('creates distribution log and returns 201', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { submittals: { data: sampleSub, error: null } } }),
      error: null,
    });
    mockCreateDistributionLog.mockResolvedValue([sampleLogEntry]);

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals/sub-1/distribution', {
        recipients: validRecipients,
      }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('sent');
    expect(mockCreateDistributionLog).toHaveBeenCalledWith('sub-1', validRecipients);
  });

  it('returns 404 when submittal not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittals: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/submittals/bad-sub/distribution', {
        recipients: validRecipients,
      }),
      makeContext('proj-1', 'bad-sub'),
    );
    expect(res.status).toBe(404);
  });
});
