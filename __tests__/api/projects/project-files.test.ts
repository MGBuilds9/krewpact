import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/projects/[id]/files/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const PROJECT_ID = TEST_IDS.PROJECT_ID;

function ctx(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClerkAuth(mockAuth);
});

// ============================================================
// GET /api/projects/[id]/files
// ============================================================

describe('GET /api/projects/[id]/files', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/files`), ctx());
    expect(res.status).toBe(401);
  });

  it('returns paginated files', async () => {
    const files = [
      {
        id: 'file-1',
        project_id: PROJECT_ID,
        file_name: 'blueprint.pdf',
        file_type: 'application/pdf',
        file_size: 1024000,
        storage_path: 'projects/file-1/blueprint.pdf',
        folder_id: null,
        is_deleted: false,
        uploaded_by: TEST_IDS.USER_ID,
        created_at: '2026-01-01',
      },
    ];
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { file_metadata: { data: files, error: null } } }),
      error: null,
    });
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/files`), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(files);
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
  });

  it('filters by folder_id', async () => {
    const client = mockSupabaseClient({
      tables: { file_metadata: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });
    const res = await GET(
      makeRequest(`/api/projects/${PROJECT_ID}/files?folder_id=folder-1`),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('file_metadata');
  });

  it('returns 500 on DB error', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { file_metadata: { data: null, error: { message: 'DB err', code: '500' } } },
      }),
      error: null,
    });
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/files`), ctx());
    expect(res.status).toBe(500);
  });
});

// ============================================================
// POST /api/projects/[id]/files
// ============================================================

describe('POST /api/projects/[id]/files', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/files`, {
        file_name: 'test.pdf',
        storage_path: 'path/test.pdf',
      }),
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    const res = await POST(makeJsonRequest(`/api/projects/${PROJECT_ID}/files`, {}), ctx());
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest(`/api/projects/${PROJECT_ID}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });
});
