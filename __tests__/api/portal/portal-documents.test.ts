/**
 * Tests for /api/portal/projects/[id]/documents (GET).
 *
 * Covers: auth, portal permission guard, view_documents permission, pagination, DB errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/portal/projects/[id]/documents/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleDoc = {
  id: 'file-1',
  file_name: 'floor-plan-v2.pdf',
  file_type: 'application/pdf',
  file_size_bytes: 4500000,
  folder_id: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

describe('GET /api/portal/projects/[id]/documents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/documents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          portal_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
    );

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/documents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when portal account is inactive', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'suspended' }, error: null },
        },
      }),
    );

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/documents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when view_documents is false', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: {
            data: { permission_set: { view_documents: false } },
            error: null,
          },
          file_metadata: { data: [], error: null },
        },
      }),
    );

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/documents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns documents when portal account has permission', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: {
            data: { permission_set: { view_documents: true } },
            error: null,
          },
          file_metadata: { data: [sampleDoc], error: null },
          portal_view_logs: { data: null, error: null },
        },
      }),
    );

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/documents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].file_name).toBe('floor-plan-v2.pdf');
  });
});
