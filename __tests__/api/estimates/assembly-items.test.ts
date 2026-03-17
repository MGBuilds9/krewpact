import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
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
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { DELETE, GET, PATCH, POST } from '@/app/api/assemblies/[id]/items/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const ASSEMBLY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ITEM_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const CATALOG_ITEM_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeAssemblyItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    assembly_id: ASSEMBLY_ID,
    catalog_item_id: null,
    line_type: 'material',
    description: 'Framing Lumber',
    quantity: 100,
    unit_cost: 2.5,
    sort_order: 0,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    cost_catalog_items: null,
    ...overrides,
  };
}

// ============================================================
// GET /api/assemblies/[id]/items
// ============================================================
describe('GET /api/assemblies/[id]/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns assembly items sorted by sort_order', async () => {
    const items = [
      makeAssemblyItem({ sort_order: 0, description: 'Lumber' }),
      makeAssemblyItem({ sort_order: 1, description: 'Nails' }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { assembly_items: { data: items, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(client.from).toHaveBeenCalledWith('assembly_items');
  });

  it('returns empty array for assembly with no items', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assembly_items: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('joins cost_catalog_items via select', async () => {
    const items = [makeAssemblyItem({ catalog_item_id: CATALOG_ITEM_ID })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { assembly_items: { data: items, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('assembly_items');
  });
});

// ============================================================
// POST /api/assemblies/[id]/items
// ============================================================
describe('POST /api/assemblies/[id]/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, {
        line_type: 'material',
        quantity: 10,
        unit_cost: 5,
      }),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(401);
  });

  it('creates assembly item and returns 201', async () => {
    const created = makeAssemblyItem();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assembly_items: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, {
        line_type: 'material',
        quantity: 100,
        unit_cost: 2.5,
        description: 'Framing Lumber',
      }),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.line_type).toBe('material');
  });

  it('returns 400 for missing line_type', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, {
        quantity: 10,
        unit_cost: 5,
      }),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero quantity', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, {
        line_type: 'labor',
        quantity: 0,
        unit_cost: 25,
      }),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative unit_cost', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, {
        line_type: 'material',
        quantity: 10,
        unit_cost: -5,
      }),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(400);
  });

  it('accepts optional catalog_item_id', async () => {
    const created = makeAssemblyItem({ catalog_item_id: CATALOG_ITEM_ID });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assembly_items: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, {
        line_type: 'material',
        quantity: 50,
        unit_cost: 3.0,
        catalog_item_id: CATALOG_ITEM_ID,
      }),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// PATCH /api/assemblies/[id]/items?item_id=...
// ============================================================
describe('PATCH /api/assemblies/[id]/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest(
        `/api/assemblies/${ASSEMBLY_ID}/items?item_id=${ITEM_ID}`,
        { quantity: 200 },
        'PATCH',
      ),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when item_id query param is missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH(
      makeJsonRequest(`/api/assemblies/${ASSEMBLY_ID}/items`, { quantity: 200 }, 'PATCH'),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('item_id');
  });

  it('updates assembly item', async () => {
    const updated = makeAssemblyItem({ quantity: 200 });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assembly_items: { data: updated, error: null } },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest(
        `/api/assemblies/${ASSEMBLY_ID}/items?item_id=${ITEM_ID}`,
        { quantity: 200 },
        'PATCH',
      ),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quantity).toBe(200);
  });

  it('returns 404 for non-existent item', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          assembly_items: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest(
        `/api/assemblies/${ASSEMBLY_ID}/items?item_id=nonexistent`,
        { quantity: 200 },
        'PATCH',
      ),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// DELETE /api/assemblies/[id]/items?item_id=...
// ============================================================
describe('DELETE /api/assemblies/[id]/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items?item_id=${ITEM_ID}`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when item_id query param is missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await DELETE(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('item_id');
  });

  it('deletes assembly item and returns success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assembly_items: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await DELETE(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items?item_id=${ITEM_ID}`),
      makeContext(ASSEMBLY_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('scopes delete to assembly_id and item_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { assembly_items: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    await DELETE(
      makeRequest(`/api/assemblies/${ASSEMBLY_ID}/items?item_id=${ITEM_ID}`),
      makeContext(ASSEMBLY_ID),
    );
    expect(client.from).toHaveBeenCalledWith('assembly_items');
  });
});
