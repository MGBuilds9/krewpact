import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/org/[slug]/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /api/org/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: DB throws (table doesn't exist) so seed data is used
    mockCreateServiceClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'relation does not exist' } }),
            }),
          }),
        }),
      }),
    } as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/org/mdm-group'), makeParams('mdm-group'));
    expect(res.status).toBe(401);
  });

  it('returns seed org data for mdm-group when DB has no table', async () => {
    mockClerkAuth(mockAuth);

    const res = await GET(makeRequest('/api/org/mdm-group'), makeParams('mdm-group'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe('org_mdm_group');
    expect(data.name).toBe('MDM Group Inc.');
    expect(data.slug).toBe('mdm-group');
    expect(data.status).toBe('active');
    expect(data.timezone).toBe('America/Toronto');
    expect(data.branding.company_name).toBe('MDM Group Inc.');
    expect(data.feature_flags).toEqual({});
  });

  it('returns 404 for unknown org slug', async () => {
    mockClerkAuth(mockAuth);

    const res = await GET(makeRequest('/api/org/unknown-org'), makeParams('unknown-org'));
    expect(res.status).toBe(404);
  });

  it('falls back to seed data when DB query returns error', async () => {
    mockClerkAuth(mockAuth);

    // createServiceClient throws — simulating missing table
    mockCreateServiceClient.mockImplementation(() => {
      throw new Error('relation "organizations" does not exist');
    });

    const res = await GET(makeRequest('/api/org/mdm-group'), makeParams('mdm-group'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe('org_mdm_group');
    expect(data.name).toBe('MDM Group Inc.');
  });
});
