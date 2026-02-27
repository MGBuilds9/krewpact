import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/leads/[id]/stage/route';
import { mockSupabaseClient, makeJsonRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const leadId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function setupLead(stage: string) {
  mockClerkAuth(mockAuth);
  const client = mockSupabaseClient({
    tables: {
      leads: { data: { id: leadId, status: stage, stage }, error: null },
      lead_stage_history: { data: null, error: null },
    },
  });
  mockCreateUserClient.mockResolvedValue(client);
  return client;
}

describe('Lead Stage Enforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  // Valid transitions
  it('allows new → qualified', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows new → lost (with lost_reason)', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'lost', lost_reason: 'No budget' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows qualified → estimating', async () => {
    setupLead('qualified');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'estimating' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows estimating → proposal_sent', async () => {
    setupLead('estimating');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'proposal_sent' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  it('allows proposal_sent → won', async () => {
    setupLead('proposal_sent');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'won' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(200);
  });

  // Invalid transitions
  it('rejects new → estimating (skip)', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'estimating' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects new → won (skip)', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'won' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects won → new (terminal)', async () => {
    setupLead('won');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'new' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects lost → qualified (terminal)', async () => {
    setupLead('lost');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('rejects same-stage transition', async () => {
    setupLead('qualified');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  // Validation
  it('requires lost_reason when transitioning to lost', async () => {
    setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'lost' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'qualified' });
    const res = await POST(req, makeContext(leadId));
    expect(res.status).toBe(401);
  });

  it('records stage change in lead_stage_history', async () => {
    const client = setupLead('new');
    const req = makeJsonRequest(`/api/crm/leads/${leadId}/stage`, { stage: 'qualified' });
    await POST(req, makeContext(leadId));

    // Verify history insert was called
    expect(client.from).toHaveBeenCalledWith('lead_stage_history');
  });
});
