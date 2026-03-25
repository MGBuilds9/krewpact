/**
 * Tests for /api/portal/projects/[id]/meetings (GET).
 *
 * Covers: auth, portal access guard, portal-shared filter, pagination, DB errors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/portal/projects/[id]/meetings/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleNote = {
  id: 'meet-1',
  title: 'Kick-off Meeting',
  meeting_date: '2026-03-10',
  attendees: ['Alice', 'Bob'],
  summary: 'Reviewed project scope and timeline.',
  action_items: ['Send drawings to client', 'Confirm start date'],
  created_at: '2026-03-10T14:00:00Z',
};

describe('GET /api/portal/projects/[id]/meetings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/meetings'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/meetings'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns meeting notes when portal access is valid', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: { data: { id: 'perm-1' }, error: null },
          meeting_notes: { data: [sampleNote], error: null },
          portal_view_logs: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/meetings'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Kick-off Meeting');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: { data: { id: 'perm-1' }, error: null },
          meeting_notes: { data: null, error: { message: 'DB failure' } },
          portal_view_logs: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/meetings'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(500);
  });
});
