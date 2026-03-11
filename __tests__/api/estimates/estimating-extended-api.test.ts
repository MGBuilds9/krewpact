import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET as GET_CATALOG, POST as POST_CATALOG } from '@/app/api/cost-catalog/route';
import {
  GET as GET_CATALOG_ID,
  PATCH as PATCH_CATALOG_ID,
  DELETE as DELETE_CATALOG_ID,
} from '@/app/api/cost-catalog/[id]/route';
import { GET as GET_ASSEMBLIES, POST as POST_ASSEMBLIES } from '@/app/api/assemblies/route';
import { GET as GET_TEMPLATES, POST as POST_TEMPLATES } from '@/app/api/estimate-templates/route';
import {
  GET as GET_ALTERNATES,
  POST as POST_ALTERNATES,
} from '@/app/api/estimates/[id]/alternates/route';
import {
  GET as GET_ALLOWANCES,
  POST as POST_ALLOWANCES,
} from '@/app/api/estimates/[id]/allowances/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeCatalogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    division_id: null,
    item_code: 'LBR-001',
    item_name: 'Framing Lumber',
    item_type: 'material',
    unit: 'bf',
    base_cost: 2.5,
    vendor_name: null,
    effective_from: null,
    effective_to: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAssembly(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    division_id: null,
    assembly_code: 'FRM-001',
    assembly_name: 'Standard Framing Package',
    description: null,
    unit: 'sqft',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    division_id: null,
    template_name: 'Residential Renovation',
    project_type: null,
    payload: { lines: [] },
    is_default: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAlternate(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    estimate_id: VALID_UUID,
    title: 'Upgraded Flooring',
    description: null,
    amount: 4500,
    selected: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAllowance(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    estimate_id: VALID_UUID,
    allowance_name: 'Owner Supplied Fixtures',
    allowance_amount: 5000,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ============================================================
// GET /api/cost-catalog
// ============================================================
describe('GET /api/cost-catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_CATALOG(makeRequest('/api/cost-catalog'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns paginated list of catalog items', async () => {
    const items = [makeCatalogItem(), makeCatalogItem({ item_name: 'Concrete Mix' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_catalog_items: { data: items, error: null } },
      }),
      error: null,
    });

    const res = await GET_CATALOG(makeRequest('/api/cost-catalog'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
  });

  it('filters by division_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { cost_catalog_items: { data: [makeCatalogItem()], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_CATALOG(makeRequest(`/api/cost-catalog?division_id=${VALID_UUID}`));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('cost_catalog_items');
  });

  it('filters by item_type', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { cost_catalog_items: { data: [makeCatalogItem()], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_CATALOG(makeRequest('/api/cost-catalog?item_type=labor'));
    expect(res.status).toBe(200);
  });
});

// ============================================================
// POST /api/cost-catalog
// ============================================================
describe('POST /api/cost-catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CATALOG(
      makeJsonRequest('/api/cost-catalog', {
        item_name: 'Lumber',
        item_type: 'material',
        unit: 'bf',
        base_cost: 2.5,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates catalog item and returns 201', async () => {
    const created = makeCatalogItem();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_catalog_items: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST_CATALOG(
      makeJsonRequest('/api/cost-catalog', {
        item_name: 'Framing Lumber',
        item_type: 'material',
        unit: 'bf',
        base_cost: 2.5,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item_name).toBe('Framing Lumber');
  });

  it('returns 400 for invalid body (missing required fields)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_CATALOG(
      makeJsonRequest('/api/cost-catalog', { item_name: 'Incomplete' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid item_type', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_CATALOG(
      makeJsonRequest('/api/cost-catalog', {
        item_name: 'Test',
        item_type: 'invalid',
        unit: 'ea',
        base_cost: 10,
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/cost-catalog/[id]
// ============================================================
describe('GET /api/cost-catalog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_CATALOG_ID(makeRequest('/api/cost-catalog/123'), makeContext('123'));
    expect(res.status).toBe(401);
  });

  it('returns single catalog item', async () => {
    const item = makeCatalogItem();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_catalog_items: { data: item, error: null } },
      }),
      error: null,
    });

    const res = await GET_CATALOG_ID(
      makeRequest(`/api/cost-catalog/${VALID_UUID}`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item_type).toBe('material');
  });

  it('returns 404 for non-existent item', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          cost_catalog_items: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
      error: null,
    });

    const res = await GET_CATALOG_ID(
      makeRequest('/api/cost-catalog/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/cost-catalog/[id]
// ============================================================
describe('PATCH /api/cost-catalog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH_CATALOG_ID(
      makeJsonRequest('/api/cost-catalog/123', { base_cost: 5 }, 'PATCH'),
      makeContext('123'),
    );
    expect(res.status).toBe(401);
  });

  it('updates catalog item and returns updated record', async () => {
    const updated = makeCatalogItem({ base_cost: 3.75 });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_catalog_items: { data: updated, error: null } },
      }),
      error: null,
    });

    const res = await PATCH_CATALOG_ID(
      makeJsonRequest('/api/cost-catalog/123', { base_cost: 3.75 }, 'PATCH'),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.base_cost).toBe(3.75);
  });

  it('returns 400 for invalid patch body (negative base_cost)', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH_CATALOG_ID(
      makeJsonRequest('/api/cost-catalog/123', { base_cost: -10 }, 'PATCH'),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/cost-catalog/[id]
// ============================================================
describe('DELETE /api/cost-catalog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE_CATALOG_ID(makeRequest('/api/cost-catalog/123'), makeContext('123'));
    expect(res.status).toBe(401);
  });

  it('deletes catalog item and returns success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_catalog_items: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await DELETE_CATALOG_ID(
      makeRequest('/api/cost-catalog/123'),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('calls cost_catalog_items table for delete', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { cost_catalog_items: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    await DELETE_CATALOG_ID(makeRequest('/api/cost-catalog/123'), makeContext(VALID_UUID));
    expect(client.from).toHaveBeenCalledWith('cost_catalog_items');
  });
});

// ============================================================
// GET /api/assemblies
// ============================================================
describe('GET /api/assemblies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_ASSEMBLIES(makeRequest('/api/assemblies'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list of assemblies', async () => {
    const assemblies = [makeAssembly(), makeAssembly({ assembly_name: 'Electrical Rough-In' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assemblies: { data: assemblies, error: null } },
      }),
      error: null,
    });

    const res = await GET_ASSEMBLIES(makeRequest('/api/assemblies'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
  });

  it('filters by division_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { assemblies: { data: [makeAssembly()], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_ASSEMBLIES(makeRequest(`/api/assemblies?division_id=${VALID_UUID}`));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('assemblies');
  });
});

// ============================================================
// POST /api/assemblies
// ============================================================
describe('POST /api/assemblies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_ASSEMBLIES(
      makeJsonRequest('/api/assemblies', { assembly_name: 'Framing', unit: 'sqft' }),
    );
    expect(res.status).toBe(401);
  });

  it('creates assembly and returns 201', async () => {
    const created = makeAssembly();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { assemblies: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST_ASSEMBLIES(
      makeJsonRequest('/api/assemblies', {
        assembly_name: 'Standard Framing Package',
        unit: 'sqft',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.assembly_name).toBe('Standard Framing Package');
  });

  it('returns 400 for invalid body (missing unit)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ASSEMBLIES(
      makeJsonRequest('/api/assemblies', { assembly_name: 'Incomplete' }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/estimate-templates
// ============================================================
describe('GET /api/estimate-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_TEMPLATES(makeRequest('/api/estimate-templates'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list of templates', async () => {
    const templates = [makeTemplate(), makeTemplate({ template_name: 'Commercial Shell' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_templates: { data: templates, error: null } },
      }),
      error: null,
    });

    const res = await GET_TEMPLATES(makeRequest('/api/estimate-templates'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
  });

  it('filters by project_type', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimate_templates: { data: [makeTemplate()], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_TEMPLATES(
      makeRequest('/api/estimate-templates?project_type=residential'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('estimate_templates');
  });
});

// ============================================================
// POST /api/estimate-templates
// ============================================================
describe('POST /api/estimate-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_TEMPLATES(
      makeJsonRequest('/api/estimate-templates', {
        template_name: 'Test',
        payload: {},
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates template and returns 201', async () => {
    const created = makeTemplate();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_templates: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST_TEMPLATES(
      makeJsonRequest('/api/estimate-templates', {
        template_name: 'Residential Renovation',
        payload: { lines: [] },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.template_name).toBe('Residential Renovation');
  });

  it('returns 400 for missing payload', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_TEMPLATES(
      makeJsonRequest('/api/estimate-templates', { template_name: 'No Payload' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing template_name', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_TEMPLATES(makeJsonRequest('/api/estimate-templates', { payload: {} }));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/estimates/[id]/alternates
// ============================================================
describe('GET /api/estimates/[id]/alternates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_ALTERNATES(
      makeRequest(`/api/estimates/${VALID_UUID}/alternates`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('returns list of alternates for an estimate', async () => {
    const alternates = [makeAlternate(), makeAlternate({ title: 'Upgraded Windows' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_alternates: { data: alternates, error: null } },
      }),
      error: null,
    });

    const res = await GET_ALTERNATES(
      makeRequest(`/api/estimates/${VALID_UUID}/alternates`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('returns empty array when estimate has no alternates', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_alternates: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await GET_ALTERNATES(
      makeRequest(`/api/estimates/${VALID_UUID}/alternates`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ============================================================
// POST /api/estimates/[id]/alternates
// ============================================================
describe('POST /api/estimates/[id]/alternates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_ALTERNATES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/alternates`, {
        title: 'Upgraded Flooring',
        amount: 4500,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('creates alternate and returns 201', async () => {
    const created = makeAlternate();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_alternates: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST_ALTERNATES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/alternates`, {
        title: 'Upgraded Flooring',
        amount: 4500,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Upgraded Flooring');
  });

  it('returns 400 for missing title', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ALTERNATES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/alternates`, { amount: 1000 }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('accepts negative amount (credit alternate)', async () => {
    const created = makeAlternate({ amount: -2000, title: 'Omit Premium Fixtures' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_alternates: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST_ALTERNATES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/alternates`, {
        title: 'Omit Premium Fixtures',
        amount: -2000,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// GET /api/estimates/[id]/allowances
// ============================================================
describe('GET /api/estimates/[id]/allowances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_ALLOWANCES(
      makeRequest(`/api/estimates/${VALID_UUID}/allowances`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('returns list of allowances for an estimate', async () => {
    const allowances = [makeAllowance(), makeAllowance({ allowance_name: 'Tile Allowance' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_allowances: { data: allowances, error: null } },
      }),
      error: null,
    });

    const res = await GET_ALLOWANCES(
      makeRequest(`/api/estimates/${VALID_UUID}/allowances`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('returns empty array when estimate has no allowances', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_allowances: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await GET_ALLOWANCES(
      makeRequest(`/api/estimates/${VALID_UUID}/allowances`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ============================================================
// POST /api/estimates/[id]/allowances
// ============================================================
describe('POST /api/estimates/[id]/allowances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_ALLOWANCES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/allowances`, {
        allowance_name: 'Fixtures',
        allowance_amount: 5000,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('creates allowance and returns 201', async () => {
    const created = makeAllowance();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_allowances: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST_ALLOWANCES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/allowances`, {
        allowance_name: 'Owner Supplied Fixtures',
        allowance_amount: 5000,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.allowance_name).toBe('Owner Supplied Fixtures');
  });

  it('returns 400 for negative allowance_amount', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ALLOWANCES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/allowances`, {
        allowance_name: 'Bad Amount',
        allowance_amount: -500,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing allowance_name', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ALLOWANCES(
      makeJsonRequest(`/api/estimates/${VALID_UUID}/allowances`, {
        allowance_amount: 3000,
      }),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(400);
  });
});
