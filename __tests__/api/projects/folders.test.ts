/**
 * Tests for /api/projects/[id]/folders (GET + POST) and /api/projects/[id]/folders/[folderId] (PATCH + DELETE).
 * Table: file_folders
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
  TEST_IDS,
} from '@/__tests__/helpers';
import { DELETE, PATCH } from '@/app/api/projects/[id]/folders/[folderId]/route';
import { GET, POST } from '@/app/api/projects/[id]/folders/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const PROJECT_ID = TEST_IDS.PROJECT_ID;
const FOLDER_ID = '00000000-0000-4000-a000-000000000501';

function listCtx(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}
function detailCtx(id: string = PROJECT_ID, folderId: string = FOLDER_ID) {
  return { params: Promise.resolve({ id, folderId }) };
}

const sampleFolder = {
  id: FOLDER_ID,
  folder_name: 'Drawings',
  folder_path: '/Drawings',
  parent_folder_id: null,
  project_id: PROJECT_ID,
  visibility: 'internal',
  created_by: TEST_IDS.USER_ID,
  created_at: '2026-03-01T08:00:00Z',
  updated_at: '2026-03-01T08:00:00Z',
};

/* --- LIST --- */
describe('GET /api/projects/[id]/folders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/p/folders'), listCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated folders', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { file_folders: { data: [sampleFolder], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/projects/p/folders'), listCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].folder_name).toBe('Drawings');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { file_folders: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/projects/p/folders'), listCtx());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/folders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/p/folders', {}), listCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/p/folders', { bad: true }), listCtx());
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { file_folders: { data: sampleFolder, error: null } } }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/projects/p/folders', { folder_name: 'Drawings' }),
      listCtx(),
    );
    expect(res.status).toBe(201);
  });
});

/* --- DETAIL --- */
describe('PATCH /api/projects/[id]/folders/[folderId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/x', { folder_name: 'Specs' }, 'PATCH'),
      detailCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated folder on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { file_folders: { data: { ...sampleFolder, folder_name: 'Specs' }, error: null } },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/x', { folder_name: 'Specs' }, 'PATCH'),
      detailCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.folder_name).toBe('Specs');
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { file_folders: { data: null, error: { message: 'not found', code: 'PGRST116' } } },
      }),
      error: null,
    });
    const res = await PATCH(makeJsonRequest('/api/x', { folder_name: 'X' }, 'PATCH'), detailCtx());
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/projects/[id]/folders/[folderId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(makeRequest('/api/x'), detailCtx());
    expect(res.status).toBe(401);
  });

  it('returns 204 on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { file_folders: { data: null, error: null } } }),
      error: null,
    });
    const res = await DELETE(makeRequest('/api/x'), detailCtx());
    expect(res.status).toBe(204);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { file_folders: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await DELETE(makeRequest('/api/x'), detailCtx());
    expect(res.status).toBe(500);
  });
});
