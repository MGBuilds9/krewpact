/**
 * Tests for /api/projects/[id]/submittals/[subId]/attachments (GET, POST, DELETE).
 *
 * Covers: auth, entity verification, file validation, listing, delete.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/services/document-control', () => ({
  listAttachments: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getAttachmentSignedUrl: vi.fn().mockResolvedValue('https://signed.url/file'),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import {
  DELETE,
  GET,
  POST,
} from '@/app/api/projects/[id]/submittals/[subId]/attachments/route';
import {
  deleteAttachment,
  listAttachments,
  uploadAttachment,
} from '@/lib/services/document-control';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockListAttachments = vi.mocked(listAttachments);
const mockUploadAttachment = vi.mocked(uploadAttachment);
const mockDeleteAttachment = vi.mocked(deleteAttachment);

function makeContext(id: string, subId: string) {
  return { params: Promise.resolve({ id, subId }) };
}

const sampleSub = { id: 'sub-1' };
const sampleAttachment = {
  id: 'att-2',
  entity_type: 'submittal' as const,
  entity_id: 'sub-1',
  file_name: 'shop-drawing.pdf',
  storage_path: 'submittal/sub-1/456-shop-drawing.pdf',
  mime_type: 'application/pdf',
  size_bytes: 204800,
  uploaded_by: 'user_test_123',
  deleted_at: null,
  created_at: '2026-03-05T00:00:00Z',
};

/* ─── GET ─── */
describe('GET /api/projects/[id]/submittals/[subId]/attachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/sub-1/attachments'),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when submittal not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittals: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/bad-sub/attachments'),
      makeContext('proj-1', 'bad-sub'),
    );
    expect(res.status).toBe(404);
  });

  it('returns attachment list with signed URLs', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { submittals: { data: sampleSub, error: null } } }),
      error: null,
    });
    mockListAttachments.mockResolvedValue([sampleAttachment]);

    const res = await GET(
      makeRequest('/api/projects/proj-1/submittals/sub-1/attachments'),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].file_name).toBe('shop-drawing.pdf');
    expect(body.data[0].downloadUrl).toBe('https://signed.url/file');
    expect(body.total).toBe(1);
  });
});

/* ─── POST ─── */
describe('POST /api/projects/[id]/submittals/[subId]/attachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/submittals/sub-1/attachments', { method: 'POST' }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 201 on successful upload', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { submittals: { data: sampleSub, error: null } } }),
      error: null,
    });
    mockUploadAttachment.mockResolvedValue({
      id: 'att-new',
      storagePath: 'submittal/sub-1/456-shop-drawing.pdf',
      publicUrl: 'https://public.url/shop-drawing.pdf',
    });

    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/projects/proj-1/submittals/sub-1/attachments',
      { method: 'POST' },
    );
    const file = new File(['%PDF-1.4'], 'shop-drawing.pdf', { type: 'application/pdf' });
    const fd = new FormData();
    fd.append('file', file);
    vi.spyOn(req, 'formData').mockResolvedValue(fd);

    const res = await POST(req, makeContext('proj-1', 'sub-1'));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('att-new');
  });

  it('returns 400 when file type is not permitted', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { submittals: { data: sampleSub, error: null } } }),
      error: null,
    });

    const { NextRequest } = await import('next/server');
    const req = new NextRequest(
      'http://localhost/api/projects/proj-1/submittals/sub-1/attachments',
      { method: 'POST' },
    );
    const file = new File(['<script>'], 'evil.js', { type: 'text/javascript' });
    const fd = new FormData();
    fd.append('file', file);
    vi.spyOn(req, 'formData').mockResolvedValue(fd);

    const res = await POST(req, makeContext('proj-1', 'sub-1'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not permitted/i);
  });
});

/* ─── DELETE ─── */
describe('DELETE /api/projects/[id]/submittals/[subId]/attachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest('/api/projects/proj-1/submittals/sub-1/attachments?attachmentId=att-2', {
        method: 'DELETE',
      }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when attachmentId missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await DELETE(
      makeRequest('/api/projects/proj-1/submittals/sub-1/attachments', { method: 'DELETE' }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful delete', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { document_attachments: { data: { id: 'att-2' }, error: null } },
      }),
      error: null,
    });
    mockDeleteAttachment.mockResolvedValue();

    const res = await DELETE(
      makeRequest('/api/projects/proj-1/submittals/sub-1/attachments?attachmentId=att-2', {
        method: 'DELETE',
      }),
      makeContext('proj-1', 'sub-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
