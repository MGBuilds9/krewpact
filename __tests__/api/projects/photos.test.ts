/**
 * Tests for /api/projects/[id]/photos (GET + POST),
 * /api/projects/[id]/photos/[photoId] (GET),
 * /api/projects/[id]/photos/[photoId]/annotations (GET + POST).
 * Tables: photo_assets, photo_annotations
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
import {
  GET as GET_ANNOTATIONS,
  POST as POST_ANNOTATION,
} from '@/app/api/projects/[id]/photos/[photoId]/annotations/route';
import { GET as GET_DETAIL } from '@/app/api/projects/[id]/photos/[photoId]/route';
import { GET as GET_LIST, POST as POST_PHOTO } from '@/app/api/projects/[id]/photos/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const PROJECT_ID = TEST_IDS.PROJECT_ID;
const PHOTO_ID = '00000000-0000-4000-a000-000000000401';

function listCtx(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}
function photoCtx(id: string = PROJECT_ID, photoId: string = PHOTO_ID) {
  return { params: Promise.resolve({ id, photoId }) };
}

const samplePhoto = {
  id: PHOTO_ID,
  project_id: PROJECT_ID,
  file_id: '00000000-0000-4000-a000-000000000402',
  category: 'progress',
  taken_at: '2026-03-01T12:00:00Z',
  location_point: null,
  created_by: TEST_IDS.USER_ID,
  created_at: '2026-03-01T12:00:00Z',
};

const sampleAnnotation = {
  id: '00000000-0000-4000-a000-000000000403',
  photo_id: PHOTO_ID,
  annotation_json: { type: 'pin', x: 100, y: 200 },
  created_by: TEST_IDS.USER_ID,
  created_at: '2026-03-01T12:05:00Z',
};

/* --- LIST --- */
describe('GET /api/projects/[id]/photos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/projects/p/photos'), listCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated photos', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { photo_assets: { data: [samplePhoto], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/projects/p/photos'), listCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { photo_assets: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/projects/p/photos'), listCtx());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/photos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_PHOTO(makeJsonRequest('/api/projects/p/photos', {}), listCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_PHOTO(
      makeJsonRequest('/api/projects/p/photos', { bad: true }),
      listCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { photo_assets: { data: samplePhoto, error: null } } }),
      error: null,
    });
    const res = await POST_PHOTO(
      makeJsonRequest('/api/projects/p/photos', {
        file_id: samplePhoto.file_id,
        category: 'progress',
      }),
      listCtx(),
    );
    expect(res.status).toBe(201);
  });
});

/* --- DETAIL --- */
describe('GET /api/projects/[id]/photos/[photoId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/x'), photoCtx());
    expect(res.status).toBe(401);
  });

  it('returns photo on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { photo_assets: { data: samplePhoto, error: null } } }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/x'), photoCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category).toBe('progress');
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { photo_assets: { data: null, error: { message: 'not found', code: 'PGRST116' } } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/x'), photoCtx());
    expect(res.status).toBe(404);
  });
});

/* --- ANNOTATIONS --- */
describe('GET /api/projects/[id]/photos/[photoId]/annotations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_ANNOTATIONS(makeRequest('/api/x'), photoCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated annotations', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { photo_annotations: { data: [sampleAnnotation], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_ANNOTATIONS(makeRequest('/api/x'), photoCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/projects/[id]/photos/[photoId]/annotations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_ANNOTATION(makeJsonRequest('/api/x', {}), photoCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ANNOTATION(makeJsonRequest('/api/x', { bad: true }), photoCtx());
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { photo_annotations: { data: sampleAnnotation, error: null } },
      }),
      error: null,
    });
    const res = await POST_ANNOTATION(
      makeJsonRequest('/api/x', { annotation_json: { type: 'pin', x: 100, y: 200 } }),
      photoCtx(),
    );
    expect(res.status).toBe(201);
  });
});
