import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { DELETE, GET, POST } from '@/app/api/crm/tags/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const TAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DIVISION_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function makeTag(overrides: Record<string, unknown> = {}) {
  return {
    id: TAG_ID,
    name: 'Priority Client',
    color: '#EF4444',
    division_id: DIVISION_ID,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================
// GET /api/crm/tags
// ============================================================
describe('GET /api/crm/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/tags'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns tag list with total', async () => {
    const tags = [makeTag(), makeTag({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: 'VIP' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tags: { data: tags, error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/tags'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(tags);
    expect(typeof body.total).toBe('number');
  });
});

// ============================================================
// POST /api/crm/tags
// ============================================================
describe('POST /api/crm/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates tag with valid body', async () => {
    const created = makeTag();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tags: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('http://localhost/api/crm/tags', {
        name: 'Priority Client',
        color: '#EF4444',
        division_id: DIVISION_ID,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Priority Client');
  });

  it('returns 400 for invalid body (empty name)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('http://localhost/api/crm/tags', { name: '', color: '#EF4444' }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/crm/tags
// ============================================================
describe('DELETE /api/crm/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a tag', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tags: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await DELETE(
      makeJsonRequest(`http://localhost/api/crm/tags?id=${TAG_ID}`, {}, 'DELETE'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 if id missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await DELETE(makeJsonRequest('http://localhost/api/crm/tags', {}, 'DELETE'));
    expect(res.status).toBe(400);
  });
});
