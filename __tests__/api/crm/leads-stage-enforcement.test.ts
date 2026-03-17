import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/leads/[id]/stage/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const leadId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function setupLead(currentStatus: string) {
  mockClerkAuth(mockAuth);
  const client = mockSupabaseClient({
    tables: {
      leads: { data: { id: leadId, status: currentStatus }, error: null },
      lead_stage_history: { data: null, error: null },
    },
  });
  mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });
  return client;
}

describe('Lead Stage Enforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  // Valid transitions
  it('allows new → qualified', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows new → lost (with lost_reason)', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, {
      status: 'lost',
      lost_reason: 'No budget',
    });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows qualified → proposal', async () => {
    setupLead('qualified');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'proposal' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows proposal → negotiation', async () => {
    setupLead('proposal');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'negotiation' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows negotiation → won', async () => {
    setupLead('negotiation');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'won' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  // Invalid transitions
  it('rejects new → proposal (skip)', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'proposal' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects new → won (skip)', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'won' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects won → new (terminal)', async () => {
    setupLead('won');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'new' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects lost → qualified (terminal)', async () => {
    setupLead('lost');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects same-stage transition', async () => {
    setupLead('qualified');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  // Validation
  it('requires lost_reason when transitioning to lost', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'lost' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(401);
  });

  it('records stage change in lead_stage_history', async () => {
    const client = setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { status: 'qualified' });
    await POST(req, makeContext(leadId));

    // Verify history insert was called
    expect(client.from).toHaveBeenCalledWith('lead_stage_history');
  });
});
