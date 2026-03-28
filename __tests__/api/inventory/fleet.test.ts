import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/request-context', () => ({
  requestContext: { run: vi.fn((_, fn) => fn()) },
  generateRequestId: vi.fn().mockReturnValue('req_test'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/lib/inventory/fleet', () => ({
  createVehicle: vi.fn(),
  listVehicles: vi.fn(),
  updateVehicle: vi.fn(),
  decommissionVehicle: vi.fn(),
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
import { DELETE, GET as GET_ID, PATCH } from '@/app/api/inventory/fleet/[id]/route';
import { GET, POST } from '@/app/api/inventory/fleet/route';
import {
  createVehicle,
  decommissionVehicle,
  listVehicles,
  updateVehicle,
} from '@/lib/inventory/fleet';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockListVehicles = vi.mocked(listVehicles);
const mockCreateVehicle = vi.mocked(createVehicle);
const mockDecommissionVehicle = vi.mocked(decommissionVehicle);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_VEHICLE_BODY = {
  unit_number: 'TRK-001',
  division_id: '00000000-0000-4000-a000-000000000001',
  vehicle_type: 'truck',
};

describe('GET /api/inventory/fleet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/inventory/fleet'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns vehicle list', async () => {
    mockClerkAuth(mockAuth);
    const vehicles = [{ id: 'v-1', unit_number: 'TRK-001' }];
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockListVehicles.mockResolvedValue({ data: vehicles as never, total: 1 });

    const res = await GET(makeRequest('/api/inventory/fleet'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(vehicles);
    expect(body.total).toBe(1);
  });
});

describe('POST /api/inventory/fleet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('creates vehicle with valid data', async () => {
    mockClerkAuth(mockAuth);
    const created = { vehicle: { id: 'v-1', unit_number: 'TRK-001' } };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockCreateVehicle.mockResolvedValue(created as never);

    const res = await POST(makeJsonRequest('/api/inventory/fleet', VALID_VEHICLE_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.vehicle.id).toBe('v-1');
  });

  it('creates vehicle with auto_create_location', async () => {
    mockClerkAuth(mockAuth);
    const created = {
      vehicle: { id: 'v-1', unit_number: 'TRK-001' },
      location: { id: 'loc-1', name: 'Vehicle - TRK-001' },
    };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockCreateVehicle.mockResolvedValue(created as never);

    const res = await POST(
      makeJsonRequest('/api/inventory/fleet', {
        ...VALID_VEHICLE_BODY,
        auto_create_location: true,
      }),
    );
    expect(res.status).toBe(201);

    expect(mockCreateVehicle).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ unit_number: 'TRK-001' }),
      true,
    );
  });

  it('returns 400 on invalid data', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });

    const res = await POST(makeJsonRequest('/api/inventory/fleet', { unit_number: '' }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory/fleet/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns single vehicle', async () => {
    mockClerkAuth(mockAuth);
    const vehicle = { id: 'v-1', unit_number: 'TRK-001' };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { fleet_vehicles: { data: vehicle, error: null } },
      }),
      error: null,
    });

    const res = await GET_ID(makeRequest('/api/inventory/fleet/v-1'), makeContext('v-1'));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/inventory/fleet/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('decommissions vehicle', async () => {
    mockClerkAuth(mockAuth);
    const decommissioned = { id: 'v-1', status: 'decommissioned', is_active: false };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockDecommissionVehicle.mockResolvedValue(decommissioned as never);

    const res = await DELETE(
      makeRequest('/api/inventory/fleet/v-1', { method: 'DELETE' }),
      makeContext('v-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('decommissioned');
  });
});
