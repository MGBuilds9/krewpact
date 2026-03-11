import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/crm/notes/route';
import { PATCH, DELETE as DELETE_NOTE } from '@/app/api/crm/notes/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const NOTE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ENTITY_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const USER_ID = 'user_test_123';

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTE_ID,
    entity_type: 'lead',
    entity_id: ENTITY_ID,
    content: 'Spoke with contact about Q2 project timeline.',
    is_pinned: false,
    created_by: USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/crm/notes
// ============================================================
describe('GET /api/crm/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest(`/api/crm/notes?entity_type=lead&entity_id=${ENTITY_ID}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns notes for entity with total and hasMore', async () => {
    const notes = [
      makeNote(),
      makeNote({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', content: 'Second note' }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notes: { data: notes, error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest(`/api/crm/notes?entity_type=lead&entity_id=${ENTITY_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(notes);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('returns 400 if missing entity_type', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest(`/api/crm/notes?entity_id=${ENTITY_ID}`));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// POST /api/crm/notes
// ============================================================
describe('POST /api/crm/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates note', async () => {
    const created = makeNote();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notes: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('http://localhost/api/crm/notes', {
        entity_type: 'lead',
        entity_id: ENTITY_ID,
        content: 'Spoke with contact about Q2 project timeline.',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe('Spoke with contact about Q2 project timeline.');
  });
});

// ============================================================
// PATCH /api/crm/notes/[id]
// ============================================================
describe('PATCH /api/crm/notes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates note content', async () => {
    const updated = makeNote({ content: 'updated content' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notes: { data: updated, error: null } },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest(
        'http://localhost/api/crm/notes/uuid-1',
        { content: 'updated content' },
        'PATCH',
      ),
      makeContext(NOTE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('updated content');
  });

  it('returns 400 for invalid body (empty content)', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('http://localhost/api/crm/notes/uuid-1', { content: '' }, 'PATCH'),
      makeContext(NOTE_ID),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/crm/notes/[id]
// ============================================================
describe('DELETE /api/crm/notes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes note', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notes: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await DELETE_NOTE(
      makeJsonRequest('http://localhost/api/crm/notes/uuid-1', {}, 'DELETE'),
      makeContext(NOTE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
