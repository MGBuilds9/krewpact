import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { DELETE, GET, POST } from '@/app/api/crm/contacts/[id]/accounts/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const CONTACT_ID = '550e8400-e29b-41d4-a716-446655440001';
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/crm/contacts/[id]/accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest(`/api/crm/contacts/${CONTACT_ID}/accounts`);
    const res = await GET(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(401);
  });

  it('returns linked accounts', async () => {
    mockClerkAuth(mockAuth);
    const links = [
      {
        id: 'link-1',
        contact_id: CONTACT_ID,
        account_id: ACCOUNT_ID,
        relationship_type: 'member',
        is_primary: true,
        account: { id: ACCOUNT_ID, account_name: 'Acme Corp' },
      },
    ];
    const client = mockSupabaseClient({
      tables: { contact_account_links: { data: links, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeRequest(`/api/crm/contacts/${CONTACT_ID}/accounts`);
    const res = await GET(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].account.account_name).toBe('Acme Corp');
  });
});

describe('POST /api/crm/contacts/[id]/accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest(`/api/crm/contacts/${CONTACT_ID}/accounts`, {
      account_id: ACCOUNT_ID,
    });
    const res = await POST(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(401);
  });

  it('creates a link with defaults', async () => {
    mockClerkAuth(mockAuth);
    const linkData = {
      id: 'link-new',
      contact_id: CONTACT_ID,
      account_id: ACCOUNT_ID,
      relationship_type: 'member',
      is_primary: false,
    };
    const client = mockSupabaseClient({
      tables: { contact_account_links: { data: linkData, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest(`/api/crm/contacts/${CONTACT_ID}/accounts`, {
      account_id: ACCOUNT_ID,
    });
    const res = await POST(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.contact_id).toBe(CONTACT_ID);
  });

  it('returns 400 for invalid account_id', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest(`/api/crm/contacts/${CONTACT_ID}/accounts`, {
      account_id: 'not-a-uuid',
    });
    const res = await POST(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/crm/contacts/[id]/accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest(`/api/crm/contacts/${CONTACT_ID}/accounts?account_id=${ACCOUNT_ID}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(401);
  });

  it('deletes a link', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contact_account_links: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeRequest(`/api/crm/contacts/${CONTACT_ID}/accounts?account_id=${ACCOUNT_ID}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it('returns 400 without account_id param', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest(`/api/crm/contacts/${CONTACT_ID}/accounts`, { method: 'DELETE' });
    const res = await DELETE(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(400);
  });
});
