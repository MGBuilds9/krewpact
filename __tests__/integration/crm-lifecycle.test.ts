/**
 * CRM Lifecycle Integration Tests
 *
 * Tests the complete lead-to-deal lifecycle through API routes.
 * These simulate E2E flows at the API level.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST as createLead } from '@/app/api/crm/leads/route';
import { POST as createContact } from '@/app/api/crm/contacts/route';
import { POST as createOpportunity } from '@/app/api/crm/opportunities/route';
import { POST as bulkLeads } from '@/app/api/crm/leads/bulk/route';
import { POST as importData } from '@/app/api/crm/import/route';
import { GET as searchCRM } from '@/app/api/crm/search/route';
import {
  mockClerkAuth,
  mockSupabaseClient,
  makeJsonRequest,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const UUID1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';

describe('CRM Lifecycle: Lead → Contact → Opportunity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a lead with full data', async () => {
    mockClerkAuth(mockAuth);
    const leadData = {
      id: UUID1,
      company_name: 'MDM Contracting',
      stage: 'new',
      source_channel: 'referral',
      estimated_value: 250000,
      city: 'Mississauga',
      province: 'Ontario',
    };
    const client = mockSupabaseClient({
      tables: { leads: { data: leadData, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/leads', {
      company_name: 'MDM Contracting',
      stage: 'new',
      source_channel: 'referral',
      estimated_value: 250000,
      city: 'Mississauga',
      province: 'Ontario',
    });
    const res = await createLead(req);
    expect(res.status).toBe(201);
  });

  it('creates a contact linked to lead', async () => {
    mockClerkAuth(mockAuth);
    const contactData = {
      id: UUID2,
      first_name: 'Michael',
      last_name: 'Guirguis',
      email: 'michael@mdm.ca',
      lead_id: UUID1,
    };
    const client = mockSupabaseClient({
      tables: { contacts: { data: contactData, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/contacts', {
      first_name: 'Michael',
      last_name: 'Guirguis',
      email: 'michael@mdm.ca',
      lead_id: UUID1,
    });
    const res = await createContact(req);
    expect(res.status).toBe(201);
  });

  it('creates opportunity from qualified lead', async () => {
    mockClerkAuth(mockAuth);
    const oppData = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      opportunity_name: 'MDM Contracting - Renovation',
      lead_id: UUID1,
      stage: 'intake',
      estimated_revenue: 250000,
    };
    const client = mockSupabaseClient({
      tables: { opportunities: { data: oppData, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/opportunities', {
      opportunity_name: 'MDM Contracting - Renovation',
      lead_id: UUID1,
      stage: 'intake',
      estimated_revenue: 250000,
    });
    const res = await createOpportunity(req);
    expect(res.status).toBe(201);
  });
});

describe('CRM Lifecycle: Bulk Operations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bulk tags multiple leads', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { entity_tags: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'tag',
      ids: [UUID1, UUID2],
      params: { tag_id: '550e8400-e29b-41d4-a716-446655440099' },
    });
    const res = await bulkLeads(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(2);
  });

  it('bulk stage change moves leads forward', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'stage',
      ids: [UUID1],
      params: { stage: 'qualified' },
    });
    const res = await bulkLeads(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(1);
  });
});

describe('CRM Lifecycle: Import', () => {
  beforeEach(() => vi.clearAllMocks());

  it('imports leads from CSV-like data', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/import', {
      entity_type: 'lead',
      rows: [
        { company_name: 'Toronto GC Ltd', city: 'Toronto', province: 'Ontario' },
        { company_name: 'Ottawa Builders', city: 'Ottawa', province: 'Ontario' },
        { company_name: 'Hamilton Reno', city: 'Hamilton', province: 'Ontario' },
      ],
    });
    const res = await importData(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(3);
    expect(body.data.skipped).toBe(0);
  });
});

describe('CRM Lifecycle: Search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searches across all entity types', async () => {
    mockClerkAuth(mockAuth);
    const leads = [{ id: UUID1, company_name: 'MDM Contracting', stage: 'qualified' }];
    const contacts = [
      { id: UUID2, first_name: 'Michael', last_name: 'MDM', email: 'michael@mdm.ca' },
    ];
    const client = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: contacts, error: null },
        accounts: { data: [], error: null },
        opportunities: { data: [], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeRequest('/api/crm/search?q=MDM');
    const res = await searchCRM(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});
