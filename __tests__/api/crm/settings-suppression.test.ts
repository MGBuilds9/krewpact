vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { mockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import { GET } from '@/app/api/crm/settings/suppression/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateClient = vi.mocked(createUserClientSafe);

describe('GET /api/crm/settings/suppression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/settings/suppression'));
    expect(res.status).toBe(401);
  });

  it('returns suppression log entries', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_account_matches: {
          data: [
            {
              lead_id: 'lead-1',
              match_type: 'company_name',
              match_score: 0.95,
              created_at: '2026-03-18T10:00:00Z',
              lead: { company_name: 'Acme Corp' },
              account: { account_name: 'Acme Corp Ltd' },
            },
          ],
          error: null,
        },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/suppression'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual({
      lead_id: 'lead-1',
      company_name: 'Acme Corp',
      account_name: 'Acme Corp Ltd',
      match_type: 'company_name',
      match_score: 0.95,
      created_at: '2026-03-18T10:00:00Z',
    });
  });

  it('returns empty array when no matches found', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_account_matches: { data: [], error: null },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/suppression'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_account_matches: { data: null, error: { message: 'db error' } },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/suppression'));
    expect(res.status).toBe(500);
  });
});
