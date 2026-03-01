import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET, POST, DELETE } from '@/app/api/crm/entity-tags/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const TAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ENTITY_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function makeEntityTag(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    entity_type: 'lead',
    entity_id: ENTITY_ID,
    tag_id: TAG_ID,
    created_at: new Date().toISOString(),
    tags: { id: TAG_ID, name: 'Priority Client', color: '#EF4444' },
    ...overrides,
  };
}

// ============================================================
// GET /api/crm/entity-tags
// ============================================================
describe('GET /api/crm/entity-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest(`/api/crm/entity-tags?entity_type=lead&entity_id=${ENTITY_ID}`),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns tags for entity', async () => {
    const entityTags = [makeEntityTag()];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { entity_tags: { data: entityTags, error: null } },
      }),
    );

    const res = await GET(
      makeRequest(`/api/crm/entity-tags?entity_type=lead&entity_id=${ENTITY_ID}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(entityTags);
  });

  it('returns 400 if missing entity_type', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(
      makeRequest(`/api/crm/entity-tags?entity_id=${ENTITY_ID}`),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// POST /api/crm/entity-tags
// ============================================================
describe('POST /api/crm/entity-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds tag to entity', async () => {
    const created = makeEntityTag();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { entity_tags: { data: created, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest(
        'http://localhost/api/crm/entity-tags',
        { entity_type: 'lead', entity_id: ENTITY_ID, tag_id: TAG_ID },
      ),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tag_id).toBe(TAG_ID);
  });

  it('returns 400 for invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest(
        'http://localhost/api/crm/entity-tags',
        { entity_type: 'invalid_type', entity_id: ENTITY_ID, tag_id: TAG_ID },
      ),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/crm/entity-tags
// ============================================================
describe('DELETE /api/crm/entity-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes tag from entity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { entity_tags: { data: null, error: null } },
      }),
    );

    const res = await DELETE(
      makeJsonRequest(
        `http://localhost/api/crm/entity-tags?entity_type=lead&entity_id=${ENTITY_ID}&tag_id=${TAG_ID}`,
        {},
        'DELETE',
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
