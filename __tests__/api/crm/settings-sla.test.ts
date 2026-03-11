vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/api/org', () => ({ getOrgIdFromAuth: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest } from '@/__tests__/helpers';
import { mockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import { GET, PATCH } from '@/app/api/crm/settings/sla/route';

const mockAuth = vi.mocked(auth);
const mockCreateClient = vi.mocked(createUserClientSafe);
const mockGetOrgId = vi.mocked(getOrgIdFromAuth);

describe('GET /api/crm/settings/sla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
    mockGetOrgId.mockResolvedValue('org_test_default');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/settings/sla'));
    expect(res.status).toBe(401);
  });

  it('returns default SLA settings when no config exists', async () => {
    const client = mockSupabaseClient({
      tables: {
        org_settings: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/sla'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_stages).toHaveLength(5);
    expect(body.opportunity_stages).toHaveLength(5);
    expect(body.lead_stages[0]).toEqual({ stage: 'new', maxHours: 48 });
  });

  it('returns stored SLA config when it exists', async () => {
    const storedConfig = {
      lead_stages: [{ stage: 'new', maxHours: 24 }],
      opportunity_stages: [{ stage: 'intake', maxHours: 12 }],
    };
    const client = mockSupabaseClient({
      tables: {
        org_settings: { data: { workflow: { sla_config: storedConfig } }, error: null },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/sla'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_stages).toEqual([{ stage: 'new', maxHours: 24 }]);
    expect(body.opportunity_stages).toEqual([{ stage: 'intake', maxHours: 12 }]);
  });

  it('returns 500 on database error', async () => {
    const client = mockSupabaseClient({
      tables: {
        org_settings: { data: null, error: { code: 'OTHER', message: 'db error' } },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/sla'));
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/crm/settings/sla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
    mockGetOrgId.mockResolvedValue('org_test_default');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(makeJsonRequest('/api/crm/settings/sla', {}, 'PATCH'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid input', async () => {
    const client = mockSupabaseClient();
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await PATCH(makeJsonRequest('/api/crm/settings/sla', { lead_stages: [] }, 'PATCH'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('returns 400 when maxHours is negative', async () => {
    const client = mockSupabaseClient();
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/settings/sla',
        {
          lead_stages: [{ stage: 'new', maxHours: -5 }],
          opportunity_stages: [{ stage: 'intake', maxHours: 24 }],
        },
        'PATCH',
      ),
    );
    expect(res.status).toBe(400);
  });

  it('updates SLA settings successfully', async () => {
    const newConfig = {
      lead_stages: [
        { stage: 'new', maxHours: 24 },
        { stage: 'contacted', maxHours: 48 },
      ],
      opportunity_stages: [{ stage: 'intake', maxHours: 12 }],
    };
    const client = mockSupabaseClient({
      tables: {
        org_settings: {
          data: { workflow: { sla_config: newConfig } },
          error: null,
        },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await PATCH(
      makeJsonRequest('/api/crm/settings/sla', newConfig as Record<string, unknown>, 'PATCH'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_stages).toHaveLength(2);
  });
});
