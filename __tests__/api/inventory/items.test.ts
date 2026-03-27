import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));

// Mock rate limit
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

// Mock business logic
vi.mock('@/lib/inventory/items', () => ({
  createItem: vi.fn(),
  listItems: vi.fn(),
  getItem: vi.fn(),
  updateItem: vi.fn(),
  deactivateItem: vi.fn(),
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
import { DELETE, GET as GET_ID, PATCH } from '@/app/api/inventory/items/[id]/route';
import { GET, POST } from '@/app/api/inventory/items/route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createItem, deactivateItem, getItem, listItems, updateItem } from '@/lib/inventory/items';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockListItems = vi.mocked(listItems);
const mockCreateItem = vi.mocked(createItem);
const mockGetItem = vi.mocked(getItem);
const mockUpdateItem = vi.mocked(updateItem);
const mockDeactivateItem = vi.mocked(deactivateItem);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_ITEM_BODY = {
  sku: 'TEST-001',
  name: 'Test Item',
  division_id: '00000000-0000-4000-a000-000000000001',
  unit_of_measure: 'each',
};

describe('GET /api/inventory/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/inventory/items'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature disabled', async () => {
    mockClerkAuth(mockAuth);
    mockIsFeatureEnabled.mockReturnValue(false);
    const res = await GET(makeRequest('/api/inventory/items'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Feature not enabled');
  });

  it('returns items list with pagination', async () => {
    mockClerkAuth(mockAuth);
    const items = [{ id: 'item-1', sku: 'SKU-001', name: 'Wire Spool' }];
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockListItems.mockResolvedValue({ data: items as never, total: 1 });

    const res = await GET(makeRequest('/api/inventory/items'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(items);
    expect(body.total).toBe(1);
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('passes filter params to listItems', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockListItems.mockResolvedValue({ data: [], total: 0 });

    const url =
      '/api/inventory/items?division_id=00000000-0000-4000-a000-000000000001&tracking_type=serial&search=cable';
    await GET(makeRequest(url));

    expect(mockListItems).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        divisionId: '00000000-0000-4000-a000-000000000001',
        trackingType: 'serial',
        search: 'cable',
      }),
    );
  });
});

describe('POST /api/inventory/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  it('creates item with valid data', async () => {
    mockClerkAuth(mockAuth);
    const created = { id: 'item-1', ...VALID_ITEM_BODY };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockCreateItem.mockResolvedValue(created as never);

    const res = await POST(makeJsonRequest('/api/inventory/items', VALID_ITEM_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('item-1');
  });

  it('returns 400 on invalid data', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });

    const res = await POST(makeJsonRequest('/api/inventory/items', { name: '' }));
    expect(res.status).toBe(400);
  });

  it('sets created_by from auth userId', async () => {
    mockClerkAuth(mockAuth, 'user_abc');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockCreateItem.mockResolvedValue({ id: 'item-1' } as never);

    await POST(makeJsonRequest('/api/inventory/items', VALID_ITEM_BODY));

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ created_by: 'user_abc' }),
    );
  });
});

describe('GET /api/inventory/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  it('returns single item', async () => {
    mockClerkAuth(mockAuth);
    const item = { id: 'item-1', sku: 'SKU-001', name: 'Cable' };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockGetItem.mockResolvedValue(item as never);

    const res = await GET_ID(makeRequest('/api/inventory/items/item-1'), makeContext('item-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('item-1');
  });

  it('returns 404 when item not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockGetItem.mockResolvedValue(null);

    const res = await GET_ID(
      makeRequest('/api/inventory/items/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/inventory/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  it('updates item with valid partial data', async () => {
    mockClerkAuth(mockAuth);
    const updated = { id: 'item-1', name: 'Updated Name' };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockUpdateItem.mockResolvedValue(updated as never);

    const res = await PATCH(
      makeJsonRequest('/api/inventory/items/item-1', { name: 'Updated Name' }, 'PATCH'),
      makeContext('item-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Name');
  });
});

describe('DELETE /api/inventory/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  it('soft deletes item', async () => {
    mockClerkAuth(mockAuth);
    const deactivated = { id: 'item-1', is_active: false };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockDeactivateItem.mockResolvedValue(deactivated as never);

    const res = await DELETE(
      makeRequest('/api/inventory/items/item-1', { method: 'DELETE' }),
      makeContext('item-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_active).toBe(false);
  });
});
