import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/logger', () => {
  const m = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  m.child.mockReturnValue(m);
  return { logger: m };
});
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: (_: unknown, fn: () => unknown) => fn() },
  generateRequestId: () => 'req_test',
  getRequestContext: () => undefined,
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeLead,
  makeOpportunity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/leads/[id]/convert/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/crm/leads/[id]/convert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/leads/lead-1/convert', {}),
      makeContext('lead-1'),
    );
    expect(res.status).toBe(401);
  });

  it('converts a won lead to opportunity', async () => {
    const lead = makeLead({ id: 'lead-1', status: 'won', company_name: 'Big Project' });
    const createdOpp = makeOpportunity({ lead_id: 'lead-1', opportunity_name: 'Big Project' });
    mockClerkAuth(mockAuth);

    // Mock: lead query returns won lead, opportunities query returns empty, insert returns opp
    const client = mockSupabaseClient({
      tables: {
        leads: { data: lead, error: null },
        opportunities: { data: createdOpp, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await POST(
      makeJsonRequest('/api/crm/leads/lead-1/convert', {}),
      makeContext('lead-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.lead_id).toBe('lead-1');
  });

  it('rejects conversion of non-won lead', async () => {
    const lead = makeLead({ id: 'lead-1', status: 'new' });
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        leads: { data: lead, error: null },
        opportunities: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await POST(
      makeJsonRequest('/api/crm/leads/lead-1/convert', {}),
      makeContext('lead-1'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('won');
  });

  it('allows custom opportunity name', async () => {
    const lead = makeLead({ id: 'lead-1', status: 'won', company_name: 'Old Name' });
    const createdOpp = makeOpportunity({ lead_id: 'lead-1', opportunity_name: 'Custom Name' });
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        leads: { data: lead, error: null },
        opportunities: { data: createdOpp, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await POST(
      makeJsonRequest('/api/crm/leads/lead-1/convert', {
        opportunity_name: 'Custom Name',
      }),
      makeContext('lead-1'),
    );
    expect(res.status).toBe(201);
  });

  it('returns 404 for non-existent lead', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        leads: {
          data: null,
          error: { message: 'Row not found', code: 'PGRST116' },
        },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await POST(
      makeJsonRequest('/api/crm/leads/nonexistent/convert', {}),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });

  it('accepts empty body (no JSON)', async () => {
    const lead = makeLead({ id: 'lead-1', status: 'won' });
    const createdOpp = makeOpportunity({ lead_id: 'lead-1' });
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        leads: { data: lead, error: null },
        opportunities: { data: createdOpp, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await POST(
      makeJsonRequest('/api/crm/leads/lead-1/convert', {}, 'POST'),
      makeContext('lead-1'),
    );
    expect(res.status).toBe(201);
  });
});
