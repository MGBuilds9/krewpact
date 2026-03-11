import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { POST as leadsBulk } from '@/app/api/crm/leads/bulk/route';
import { POST as contactsBulk } from '@/app/api/crm/contacts/bulk/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

// Valid RFC 4122 v4 UUIDs for tests
const UUID1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID3 = '550e8400-e29b-41d4-a716-446655440003';
const ASSIGNEE_UUID = '550e8400-e29b-41d4-a716-446655440099';

// Generate 101 UUIDs to test the max limit
function makeIds(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
  );
}

describe('POST /api/crm/leads/bulk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid action', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'invalid_action',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 if ids array is empty', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: [],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 if ids exceeds 100 items', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: makeIds(101),
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockClerkAuth(mockAuth);
    const req = new Request('http://localhost/api/crm/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as unknown as import('next/server').NextRequest;
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
  });

  // --- assign ---
  it('assign: updates assigned_to for all IDs', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'assign',
      ids: [UUID1, UUID2],
      value: ASSIGNEE_UUID,
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.updated).toBe(2);
  });

  it('assign: returns 400 if value is missing', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'assign',
      ids: [UUID1],
    });
    const client = mockSupabaseClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('value is required');
  });

  it('assign: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: { message: 'DB down' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'assign',
      ids: [UUID1],
      value: ASSIGNEE_UUID,
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(500);
  });

  // --- stage ---
  it('stage: updates status for all IDs', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'stage',
      ids: [UUID1, UUID2, UUID3],
      value: 'qualified',
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.updated).toBe(3);
  });

  it('stage: returns 400 if value is missing', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'stage',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
  });

  it('stage: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: { message: 'constraint violation' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'stage',
      ids: [UUID1],
      value: 'bad_status',
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(500);
  });

  // --- delete (soft) ---
  it('delete: soft-deletes leads by setting status to deleted', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: [UUID1, UUID2],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(2);
  });

  it('delete: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: { message: 'RLS violation' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(500);
  });

  // --- export ---
  it('export: returns CSV with correct headers and data', async () => {
    mockClerkAuth(mockAuth);
    const leadData = [
      {
        company_name: 'Acme Corp',
        contact_name: 'John Doe',
        email: 'john@acme.com',
        phone: '416-555-0100',
        status: 'new',
        source_channel: 'website',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        company_name: 'Beta Inc',
        contact_name: 'Jane Smith',
        email: 'jane@beta.com',
        phone: '416-555-0200',
        status: 'qualified',
        source_channel: 'referral',
        created_at: '2026-02-01T00:00:00Z',
      },
    ];
    const client = mockSupabaseClient({
      tables: { leads: { data: leadData, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'export',
      ids: [UUID1, UUID2],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('leads-export.csv');

    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines[0]).toBe('company_name,contact_name,email,phone,status,source,created_at');
    expect(lines[1]).toContain('Acme Corp');
    expect(lines[1]).toContain('website');
    expect(lines[2]).toContain('Beta Inc');
    expect(lines[2]).toContain('referral');
  });

  it('export: returns CSV with header only when no data found', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'export',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('company_name');
  });

  it('export: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: { message: 'timeout' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'export',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(500);
  });

  it('export: handles values with commas in CSV output', async () => {
    mockClerkAuth(mockAuth);
    const leadData = [
      {
        company_name: 'Smith, Jones & Associates',
        contact_name: 'Al "The Boss" Smith',
        email: 'al@sj.com',
        phone: null,
        status: 'new',
        source_channel: 'website',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    const client = mockSupabaseClient({
      tables: { leads: { data: leadData, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'export',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const csv = await res.text();
    // Company name with comma should be quoted
    expect(csv).toContain('"Smith, Jones & Associates"');
    // Contact name with quotes should be double-escaped
    expect(csv).toContain('"Al ""The Boss"" Smith"');
  });

  // --- accepts exactly 100 items ---
  it('accepts exactly 100 items', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: makeIds(100),
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/crm/contacts/bulk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid action', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'stage',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 if ids exceeds 100 items', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: makeIds(101),
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 if ids array is empty', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: [],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(400);
  });

  // --- assign ---
  it('assign: updates assigned_to for all contact IDs', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'assign',
      ids: [UUID1, UUID2],
      value: ASSIGNEE_UUID,
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.updated).toBe(2);
  });

  it('assign: returns 400 if value is missing', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'assign',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('value is required');
  });

  it('assign: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: { message: 'permission denied' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'assign',
      ids: [UUID1],
      value: ASSIGNEE_UUID,
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(500);
  });

  // --- delete (soft) ---
  it('delete: soft-deletes contacts by setting deleted_at', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(1);
  });

  it('delete: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: { message: 'RLS' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(500);
  });

  // --- export ---
  it('export: returns CSV with correct headers and data', async () => {
    mockClerkAuth(mockAuth);
    const contactData = [
      {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@test.com',
        phone: '416-555-0100',
        company: 'Acme Corp',
        title: 'Project Manager',
        created_at: '2026-01-15T00:00:00Z',
      },
    ];
    const client = mockSupabaseClient({
      tables: { contacts: { data: contactData, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'export',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('contacts-export.csv');

    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines[0]).toBe('first_name,last_name,email,phone,company,title,created_at');
    expect(lines[1]).toContain('Alice');
    expect(lines[1]).toContain('Johnson');
    expect(lines[1]).toContain('Acme Corp');
  });

  it('export: returns CSV header only when no data', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'export',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('export: returns 500 on db error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: { message: 'timeout' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'export',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(500);
  });

  // --- accepts exactly 100 items ---
  it('accepts exactly 100 items', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: makeIds(100),
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(200);
  });
});
