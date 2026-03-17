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
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/dashboard/metrics/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

describe('GET /api/crm/dashboard/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/dashboard/metrics'));
    expect(res.status).toBe(401);
  });

  it('returns dashboard metrics with default period', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: [], error: null },
          leads: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/dashboard/metrics'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('pipeline');
    expect(body).toHaveProperty('conversion');
    expect(body).toHaveProperty('velocity');
    expect(body).toHaveProperty('sources');
  });

  it('accepts period query parameter', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: [], error: null },
          leads: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/dashboard/metrics?period=quarter'));
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid period', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/crm/dashboard/metrics?period=invalid'));
    expect(res.status).toBe(400);
  });

  it('returns 500 on Supabase error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: null, error: { message: 'DB error' } },
          leads: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/dashboard/metrics'));
    expect(res.status).toBe(500);
  });
});
