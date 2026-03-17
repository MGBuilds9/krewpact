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
import { DELETE, GET as GET_BY_ID, PATCH } from '@/app/api/crm/email-templates/[id]/route';
import { GET, POST } from '@/app/api/crm/email-templates/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

describe('GET /api/crm/email-templates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/email-templates'));
    expect(res.status).toBe(401);
  });

  it('returns templates list', async () => {
    mockClerkAuth(mockAuth);
    const templates = [{ id: 'tpl-1', name: 'Test', category: 'outreach', subject: 'Hi' }];
    const client = mockSupabaseClient({
      tables: { email_templates: { data: templates, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/email-templates'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });
});

describe('POST /api/crm/email-templates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new template', async () => {
    mockClerkAuth(mockAuth);
    const created = {
      id: 'tpl-new',
      name: 'New Template',
      category: 'outreach',
      subject: 'Hello {{first_name}}',
      body_html: '<p>Hi</p>',
    };
    const client = mockSupabaseClient({
      tables: { email_templates: { data: created, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/email-templates', {
      name: 'New Template',
      category: 'outreach',
      subject: 'Hello {{first_name}}',
      body_html: '<p>Hi</p>',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('New Template');
  });

  it('returns 400 for invalid body', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/email-templates', {
      name: '',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/crm/email-templates/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a single template', async () => {
    mockClerkAuth(mockAuth);
    const template = {
      id: 'tpl-1',
      name: 'Test',
      category: 'outreach',
      subject: 'Hi',
      body_html: '<p>Hello</p>',
    };
    const client = mockSupabaseClient({
      tables: { email_templates: { data: template, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_BY_ID(makeRequest('/api/crm/email-templates/tpl-1'), {
      params: Promise.resolve({ id: 'tpl-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('tpl-1');
  });
});

describe('PATCH /api/crm/email-templates/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates a template', async () => {
    mockClerkAuth(mockAuth);
    const updated = {
      id: 'tpl-1',
      name: 'Updated',
      category: 'follow_up',
      subject: 'Updated subject',
      body_html: '<p>Updated</p>',
    };
    const client = mockSupabaseClient({
      tables: { email_templates: { data: updated, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const req = makeJsonRequest('/api/crm/email-templates/tpl-1', { name: 'Updated' }, 'PATCH');
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'tpl-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated');
  });
});

describe('DELETE /api/crm/email-templates/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a template', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { email_templates: { data: null, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await DELETE(makeRequest('/api/crm/email-templates/tpl-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'tpl-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
