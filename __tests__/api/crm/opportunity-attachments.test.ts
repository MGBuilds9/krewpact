import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks BEFORE imports
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { DELETE, GET, POST } from '@/app/api/crm/opportunities/[id]/attachments/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const OPP_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

function createStorageMock(overrides: Record<string, unknown> = {}) {
  const storageBucket = {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          name: 'proposal.pdf',
          metadata: { size: 102400 },
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
        },
      ],
      error: null,
    }),
    upload: vi.fn().mockResolvedValue({
      data: { path: `opportunity-attachments/${OPP_ID}/test.pdf` },
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ data: [{ name: 'test.pdf' }], error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/contracts/test.pdf?token=abc' },
    }),
    ...overrides,
  };

  const client = {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue(storageBucket),
    },
  };

  return { client, storageBucket };
}

describe('GET /api/crm/opportunities/[id]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments`),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(401);
  });

  it('lists files from storage', async () => {
    mockClerkAuth(mockAuth);
    const { client } = createStorageMock();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments`),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.files).toHaveLength(1);
    expect(body.files[0].name).toBe('proposal.pdf');
    expect(body.files[0].signed_url).toBeDefined();
  });

  it('returns empty array when no files exist', async () => {
    mockClerkAuth(mockAuth);
    const { client } = createStorageMock({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments`),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.files).toEqual([]);
  });

  it('returns 500 on storage error', async () => {
    mockClerkAuth(mockAuth);
    const { client } = createStorageMock({
      list: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage error' } }),
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments`),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(500);
  });
});

describe('POST /api/crm/opportunities/[id]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));

    const req = new Request(`http://localhost:3000/api/crm/opportunities/${OPP_ID}/attachments`, {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req as never, makeContext(OPP_ID));
    expect(res.status).toBe(401);
  });

  it('uploads a file to storage', async () => {
    mockClerkAuth(mockAuth);
    const { client } = createStorageMock();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);

    // Mock formData() because jsdom Request.formData() hangs on streamed bodies
    const req = new Request(`http://localhost:3000/api/crm/opportunities/${OPP_ID}/attachments`, {
      method: 'POST',
    });
    vi.spyOn(req, 'formData').mockResolvedValue(formData);

    const res = await POST(req as never, makeContext(OPP_ID));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBeDefined();
    expect(body.signed_url).toBeDefined();
  });

  it('returns 400 when no file provided', async () => {
    mockClerkAuth(mockAuth);
    const { client } = createStorageMock();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const formData = new FormData();
    const req = new Request(`http://localhost:3000/api/crm/opportunities/${OPP_ID}/attachments`, {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req as never, makeContext(OPP_ID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No file provided');
  });
});

describe('DELETE /api/crm/opportunities/[id]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments?fileName=test.pdf`, {
        method: 'DELETE',
      }),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(401);
  });

  it('deletes a file from storage', async () => {
    mockClerkAuth(mockAuth);
    const { client, storageBucket } = createStorageMock();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await DELETE(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments?fileName=proposal.pdf`, {
        method: 'DELETE',
      }),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(storageBucket.remove).toHaveBeenCalledWith([
      `opportunity-attachments/${OPP_ID}/proposal.pdf`,
    ]);
  });

  it('returns 400 when fileName is missing', async () => {
    mockClerkAuth(mockAuth);
    const { client } = createStorageMock();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await DELETE(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/attachments`, { method: 'DELETE' }),
      makeContext(OPP_ID),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('fileName');
  });
});
