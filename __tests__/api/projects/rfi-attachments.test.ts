/**
 * Tests for /api/projects/[id]/rfis/[rfiId]/attachments (GET, POST, DELETE).
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
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { DELETE, GET, POST } from '@/app/api/projects/[id]/rfis/[rfiId]/attachments/route';
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

function makeContext(id: string, rfiId: string) {
  return { params: Promise.resolve({ id, rfiId }) };
}

const sampleRfi = { id: 'rfi-1' };
const sampleAttachment = {
  id: 'att-1',
  entity_type: 'rfi' as const,
  entity_id: 'rfi-1',
  file_name: 'drawing.pdf',
  storage_path: 'rfi/rfi-1/123-drawing.pdf',
  mime_type: 'application/pdf',
  size_bytes: 102400,
  uploaded_by: 'user_test_123',
  deleted_at: null,
  created_at: '2026-03-01T00:00:00Z',
};

/* ─── GET ─── */
describe('GET /api/projects/[id]/rfis/[rfiId]/attachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/projects/proj-1/rfis/rfi-1/attachments'),
      makeContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when RFI not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { rfi_items: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/rfis/bad-rfi/attachments'),
      makeContext('proj-1', 'bad-rfi'),
    );
    expect(res.status).toBe(404);
  });

  it('returns attachment list with signed URLs', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: sampleRfi, error: null } } }),
      error: null,
    });
    mockListAttachments.mockResolvedValue([sampleAttachment]);

    const res = await GET(
      makeRequest('/api/projects/proj-1/rfis/rfi-1/attachments'),
      makeContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].file_name).toBe('drawing.pdf');
    expect(body.data[0].downloadUrl).toBe('https://signed.url/file');
  });
});

/* ─── POST ─── */
describe('POST /api/projects/[id]/rfis/[rfiId]/attachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/rfis/rfi-1/attachments', { method: 'POST' }),
      makeContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file field', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: sampleRfi, error: null } } }),
      error: null,
    });

    // FormData with no 'file' key — get() returns null → route returns 400
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/projects/proj-1/rfis/rfi-1/attachments', {
      method: 'POST',
    });
    vi.spyOn(req, 'formData').mockResolvedValue(new FormData());

    const res = await POST(req, makeContext('proj-1', 'rfi-1'));
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful upload', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: sampleRfi, error: null } } }),
      error: null,
    });
    mockUploadAttachment.mockResolvedValue({
      id: 'att-new',
      storagePath: 'rfi/rfi-1/123-drawing.pdf',
      publicUrl: 'https://public.url/drawing.pdf',
    });

    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/projects/proj-1/rfis/rfi-1/attachments', {
      method: 'POST',
    });
    const file = new File(['%PDF-1.4'], 'drawing.pdf', { type: 'application/pdf' });
    const fd = new FormData();
    fd.append('file', file);
    vi.spyOn(req, 'formData').mockResolvedValue(fd);

    const res = await POST(req, makeContext('proj-1', 'rfi-1'));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('att-new');
  });
});

/* ─── DELETE ─── */
describe('DELETE /api/projects/[id]/rfis/[rfiId]/attachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest('/api/projects/proj-1/rfis/rfi-1/attachments?attachmentId=att-1', {
        method: 'DELETE',
      }),
      makeContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when attachmentId missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await DELETE(
      makeRequest('/api/projects/proj-1/rfis/rfi-1/attachments', { method: 'DELETE' }),
      makeContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful delete', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { document_attachments: { data: { id: 'att-1' }, error: null } },
      }),
      error: null,
    });
    mockDeleteAttachment.mockResolvedValue();

    const res = await DELETE(
      makeRequest('/api/projects/proj-1/rfis/rfi-1/attachments?attachmentId=att-1', {
        method: 'DELETE',
      }),
      makeContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
