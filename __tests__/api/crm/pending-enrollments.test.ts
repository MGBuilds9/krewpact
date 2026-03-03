import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/sequences/pending-enrollments/route';
import { POST as approveHandler } from '@/app/api/crm/sequences/pending-enrollments/[id]/approve/route';
import { POST as rejectHandler } from '@/app/api/crm/sequences/pending-enrollments/[id]/reject/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('GET /api/crm/sequences/pending-enrollments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/sequences/pending-enrollments'));
    expect(res.status).toBe(401);
  });

  it('returns pending enrollments list', async () => {
    mockClerkAuth(mockAuth);
    const pendingEnrollments = [
      {
        id: 'enrollment-1',
        sequence_id: 'seq-1',
        lead_id: 'lead-1',
        contact_id: null,
        status: 'pending_approval',
        created_at: '2026-02-26T00:00:00Z',
      },
      {
        id: 'enrollment-2',
        sequence_id: 'seq-2',
        lead_id: 'lead-2',
        contact_id: 'contact-2',
        status: 'pending_approval',
        created_at: '2026-02-26T01:00:00Z',
      },
    ];

    const client = mockSupabaseClient({
      tables: {
        sequence_enrollments: { data: pendingEnrollments, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/sequences/pending-enrollments'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });
});

describe('POST /api/crm/sequences/pending-enrollments/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated enrollment on approve', async () => {
    mockClerkAuth(mockAuth);
    const updated = {
      id: 'enrollment-1',
      status: 'active',
      sequence_id: 'seq-1',
      lead_id: 'lead-1',
    };

    const client = mockSupabaseClient({
      tables: {
        sequence_enrollments: { data: updated, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/sequences/pending-enrollments/enrollment-1/approve', {});
    const res = await approveHandler(req, {
      params: Promise.resolve({ id: 'enrollment-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data ?? body).toMatchObject({ status: 'active' });
  });
});

describe('POST /api/crm/sequences/pending-enrollments/[id]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated enrollment on reject', async () => {
    mockClerkAuth(mockAuth);
    const updated = {
      id: 'enrollment-1',
      status: 'cancelled',
      sequence_id: 'seq-1',
      lead_id: 'lead-1',
    };

    const client = mockSupabaseClient({
      tables: {
        sequence_enrollments: { data: updated, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/sequences/pending-enrollments/enrollment-1/reject', {});
    const res = await rejectHandler(req, {
      params: Promise.resolve({ id: 'enrollment-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data ?? body).toMatchObject({ status: 'cancelled' });
  });
});
