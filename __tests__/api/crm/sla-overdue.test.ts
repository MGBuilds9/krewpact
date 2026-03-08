import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/sla/overdue/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeLead,
  makeOpportunity,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('GET /api/crm/sla/overdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(new Request('http://localhost/api/crm/sla/overdue') as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns empty overdue arrays when no leads or opportunities exceed SLA', async () => {
    mockClerkAuth(mockAuth);
    // Leads entered at current stage just now — well within SLA
    const freshLead = makeLead({
      status: 'new',
      stage_entered_at: new Date().toISOString(),
    });
    const freshOpp = makeOpportunity({
      stage: 'intake',
      stage_entered_at: new Date().toISOString(),
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [freshLead], error: null },
          opportunities: { data: [freshOpp], error: null },
        },
      }),
    );

    const res = await GET(new Request('http://localhost/api/crm/sla/overdue') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overdue).toHaveLength(0);
    expect(body.counts.total).toBe(0);
    expect(body.counts.leads).toBe(0);
    expect(body.counts.opportunities).toBe(0);
  });

  it('returns overdue leads past SLA deadline', async () => {
    mockClerkAuth(mockAuth);
    // Lead in 'new' stage (48h SLA) — entered 72 hours ago
    const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const overdueLead = makeLead({
      status: 'new',
      stage_entered_at: staleDate,
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [overdueLead], error: null },
          opportunities: { data: [], error: null },
        },
      }),
    );

    const res = await GET(new Request('http://localhost/api/crm/sla/overdue') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counts.leads).toBe(1);
    expect(body.counts.opportunities).toBe(0);
    expect(body.counts.total).toBe(1);
    expect(body.overdue[0].entityType).toBe('lead');
    expect(body.overdue[0].sla.isOverdue).toBe(true);
  });

  it('returns overdue opportunities past SLA deadline', async () => {
    mockClerkAuth(mockAuth);
    // Opportunity in 'intake' stage (24h SLA) — entered 48 hours ago
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const overdueOpp = makeOpportunity({
      stage: 'intake',
      stage_entered_at: staleDate,
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [], error: null },
          opportunities: { data: [overdueOpp], error: null },
        },
      }),
    );

    const res = await GET(new Request('http://localhost/api/crm/sla/overdue') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counts.opportunities).toBe(1);
    expect(body.counts.leads).toBe(0);
    expect(body.counts.total).toBe(1);
    expect(body.overdue[0].entityType).toBe('opportunity');
    expect(body.overdue[0].sla.isOverdue).toBe(true);
  });

  it('returns 500 on Supabase leads query error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          leads: { data: null, error: { message: 'DB connection failed' } },
          opportunities: { data: [], error: null },
        },
      }),
    );

    const res = await GET(new Request('http://localhost/api/crm/sla/overdue') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB connection failed');
  });

  it('returns combined overdue leads and opportunities together', async () => {
    mockClerkAuth(mockAuth);
    const staleDate72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const staleDate48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const overdueLead = makeLead({ status: 'new', stage_entered_at: staleDate72h });
    const overdueOpp = makeOpportunity({ stage: 'intake', stage_entered_at: staleDate48h });

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [overdueLead], error: null },
          opportunities: { data: [overdueOpp], error: null },
        },
      }),
    );

    const res = await GET(new Request('http://localhost/api/crm/sla/overdue') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counts.total).toBe(2);
    expect(body.counts.leads).toBe(1);
    expect(body.counts.opportunities).toBe(1);
    expect(body.overdue).toHaveLength(2);

    const entityTypes = body.overdue.map((e: { entityType: string }) => e.entityType);
    expect(entityTypes).toContain('lead');
    expect(entityTypes).toContain('opportunity');
  });
});
