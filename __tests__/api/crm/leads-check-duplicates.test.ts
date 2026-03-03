import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/leads/check-duplicates/route';
import {
  mockSupabaseClient,
  makeJsonRequest,
  mockClerkAuth,
  mockClerkUnauth,
} from '@/__tests__/helpers';

const existingLeads = [
  {
    id: 'lead-1',
    company_name: 'MDM Contracting',
    domain: 'mdmcontracting.ca',
    city: 'Mississauga',
    lead_score: 80,
    status: 'qualified',
    division_id: 'div-1',
    created_at: '2026-01-01',
  },
  {
    id: 'lead-2',
    company_name: 'Shoppers Drug Mart',
    domain: 'shoppersdrugmart.ca',
    city: 'Toronto',
    lead_score: 50,
    status: 'new',
    division_id: 'div-1',
    created_at: '2026-01-02',
  },
];

beforeEach(() => {
  mockClerkAuth(auth as unknown as ReturnType<typeof vi.fn>);
  vi.mocked(createUserClient).mockResolvedValue(
    mockSupabaseClient({
      tables: {
        leads: { data: existingLeads, error: null },
      },
    }),
  );
});

describe('POST /api/crm/leads/check-duplicates', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockClerkUnauth(auth as unknown as ReturnType<typeof vi.fn>);
    const req = makeJsonRequest('/api/crm/leads/check-duplicates', { company_name: 'Test' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid payload', async () => {
    const req = makeJsonRequest('/api/crm/leads/check-duplicates', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('detects domain match', async () => {
    const req = makeJsonRequest('/api/crm/leads/check-duplicates', {
      company_name: 'Any Name',
      domain: 'mdmcontracting.ca',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hasDuplicates).toBe(true);
    expect(data.matches[0].matchType).toBe('exact_domain');
  });

  it('detects fuzzy company name match', async () => {
    const req = makeJsonRequest('/api/crm/leads/check-duplicates', {
      company_name: 'MDM Contracting Inc',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hasDuplicates).toBe(true);
  });

  it('returns no duplicates for unique lead', async () => {
    const req = makeJsonRequest('/api/crm/leads/check-duplicates', {
      company_name: 'Totally Unique Company XYZ',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hasDuplicates).toBe(false);
    expect(data.matches).toHaveLength(0);
  });
});
