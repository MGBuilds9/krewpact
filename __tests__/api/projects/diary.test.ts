/**
 * Tests for /api/projects/[id]/diary (GET + POST) and /api/projects/[id]/diary/[entryId] (GET + PATCH + DELETE).
 * Table: site_diary_entries
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
import { GET, POST } from '@/app/api/projects/[id]/diary/route';
import { GET as GET_DETAIL, PATCH, DELETE } from '@/app/api/projects/[id]/diary/[entryId]/route';
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
const ENTRY_ID = '00000000-0000-4000-a000-000000000301';

function listCtx(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}
function detailCtx(id: string = PROJECT_ID, entryId: string = ENTRY_ID) {
  return { params: Promise.resolve({ id, entryId }) };
}

const sampleEntry = {
  id: ENTRY_ID,
  project_id: PROJECT_ID,
  entry_at: '2026-03-05T09:00:00Z',
  entry_type: 'weather',
  entry_text: 'Sunny, 15C',
  created_by: TEST_IDS.USER_ID,
  created_at: '2026-03-05T09:00:00Z',
  updated_at: '2026-03-05T09:00:00Z',
};

/* ---------- LIST ---------- */
describe('GET /api/projects/[id]/diary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/p/diary'), listCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated diary entries', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { site_diary_entries: { data: [sampleEntry], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/projects/p/diary'), listCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { site_diary_entries: { data: null, error: { message: 'fail' }, count: null } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/projects/p/diary'), listCtx());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/diary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/p/diary', {}), listCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/p/diary', { bad: true }), listCtx());
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { site_diary_entries: { data: sampleEntry, error: null } },
      }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/projects/p/diary', {
        entry_at: '2026-03-05T09:00:00Z',
        entry_type: 'weather',
        entry_text: 'Sunny',
      }),
      listCtx(),
    );
    expect(res.status).toBe(201);
  });
});

/* ---------- DETAIL ---------- */
describe('GET /api/projects/[id]/diary/[entryId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/projects/p/diary/e'), detailCtx());
    expect(res.status).toBe(401);
  });

  it('returns entry on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { site_diary_entries: { data: sampleEntry, error: null } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/projects/p/diary/e'), detailCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry_type).toBe('weather');
  });

  it('returns 404 when entry not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          site_diary_entries: { data: null, error: { message: 'not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/projects/p/diary/e'), detailCtx());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/projects/[id]/diary/[entryId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/x', { entry_text: 'updated' }, 'PATCH'),
      detailCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated entry on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          site_diary_entries: { data: { ...sampleEntry, entry_text: 'updated' }, error: null },
        },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/x', { entry_text: 'updated' }, 'PATCH'),
      detailCtx(),
    );
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/projects/[id]/diary/[entryId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(makeRequest('/api/x'), detailCtx());
    expect(res.status).toBe(401);
  });

  it('returns 204 on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { site_diary_entries: { data: null, error: null } } }),
      error: null,
    });
    const res = await DELETE(makeRequest('/api/x'), detailCtx());
    expect(res.status).toBe(204);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { site_diary_entries: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await DELETE(makeRequest('/api/x'), detailCtx());
    expect(res.status).toBe(500);
  });
});
