import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST as leadsBulk } from '@/app/api/crm/leads/bulk/route';
import { POST as contactsBulk } from '@/app/api/crm/contacts/bulk/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

// Valid RFC 4122 v4 UUIDs for tests (Zod v4 validates version bits)
const UUID1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID_TAG = '550e8400-e29b-41d4-a716-446655440099';

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

  it('bulk delete returns success count', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'delete',
      ids: [UUID1, UUID2],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(2);
  });

  it('bulk stage change updates leads', async () => {
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
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(1);
  });

  it('bulk tag requires tag_id', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'tag',
      ids: [UUID1],
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(400);
  });

  it('bulk tag adds tags to leads', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { entity_tags: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/leads/bulk', {
      action: 'tag',
      ids: [UUID1],
      params: { tag_id: UUID_TAG },
    });
    const res = await leadsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(1);
  });
});

describe('POST /api/crm/contacts/bulk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bulk delete contacts', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contacts: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/contacts/bulk', {
      action: 'delete',
      ids: [UUID1],
    });
    const res = await contactsBulk(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(1);
  });
});
