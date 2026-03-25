/**
 * Tests for lib/services/document-control.ts
 *
 * Covers: uploadAttachment, listAttachments, deleteAttachment,
 *         getAttachmentSignedUrl, createDistributionLog, getDistributionLog.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
  createUserClientSafe: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { mockSupabaseClient } from '@/__tests__/helpers';
import {
  createDistributionLog,
  deleteAttachment,
  getAttachmentSignedUrl,
  getDistributionLog,
  listAttachments,
  uploadAttachment,
} from '@/lib/services/document-control';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const sampleAttachment = {
  id: 'att-1',
  entity_type: 'rfi',
  entity_id: 'rfi-1',
  file_name: 'drawing.pdf',
  storage_path: 'rfi/rfi-1/123-drawing.pdf',
  mime_type: 'application/pdf',
  size_bytes: 102400,
  uploaded_by: 'user_test_123',
  deleted_at: null,
  created_at: '2026-03-01T00:00:00Z',
};

const sampleDistLog = {
  id: 'dist-1',
  submittal_id: 'sub-1',
  recipient_user_id: '550e8400-e29b-41d4-a716-446655440000',
  recipient_email: 'engineer@firm.com',
  recipient_name: 'Alex Engineer',
  status: 'sent',
  sent_at: '2026-03-10T10:00:00Z',
  acknowledged_at: null,
  created_at: '2026-03-10T10:00:00Z',
};

// ============================================================
// uploadAttachment
// ============================================================
describe('uploadAttachment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads file and inserts attachment record', async () => {
    const storageClient = {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://public.url/file' } }),
        remove: vi.fn().mockResolvedValue({}),
      }),
    };

    const dbChain = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'att-new' }, error: null }),
          }),
        }),
      }),
    };

    const client = { ...storageClient, ...dbChain, storage: storageClient };
    // Build a client that has both storage and db via from
    const supabaseClient = {
      storage: storageClient,
      from: dbChain.from,
    };

    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    const file = new File(['%PDF-1.4'], 'drawing.pdf', { type: 'application/pdf' });
    const result = await uploadAttachment(file, 'rfi', 'rfi-1', 'user_test_123');

    expect(result.id).toBe('att-new');
    expect(result.storagePath).toContain('rfi/rfi-1/');
    expect(result.storagePath).toContain('drawing.pdf');
  });

  it('throws and cleans up storage on DB insert failure', async () => {
    const removeMock = vi.fn().mockResolvedValue({});
    const storageClient = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://public.url/file' } }),
      remove: removeMock,
    };

    const supabaseClient = {
      storage: { from: vi.fn().mockReturnValue(storageClient) },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      }),
    };

    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    const file = new File(['%PDF-1.4'], 'drawing.pdf', { type: 'application/pdf' });
    await expect(uploadAttachment(file, 'rfi', 'rfi-1', 'user_test_123')).rejects.toThrow(
      'Failed to record attachment',
    );
    expect(removeMock).toHaveBeenCalled();
  });
});

// ============================================================
// listAttachments
// ============================================================
describe('listAttachments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns attachments for an entity', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { document_attachments: { data: [sampleAttachment], error: null } },
      }),
      error: null,
    });

    const result = await listAttachments('rfi', 'rfi-1');
    expect(result).toHaveLength(1);
    expect(result[0].file_name).toBe('drawing.pdf');
  });

  it('throws when auth fails', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: null,
      error: { status: 401 } as never,
    });

    await expect(listAttachments('rfi', 'rfi-1')).rejects.toThrow('Authentication required');
  });

  it('throws on DB error', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        defaultResponse: { data: null, error: { message: 'DB connection failed' } },
      }),
      error: null,
    });

    await expect(listAttachments('rfi', 'rfi-1')).rejects.toThrow('Failed to list attachments');
  });
});

// ============================================================
// deleteAttachment
// ============================================================
describe('deleteAttachment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes an attachment', async () => {
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      from: vi.fn(),
    };
    const supabaseClient = { from: vi.fn().mockReturnValue(updateChain) };
    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    await expect(deleteAttachment('att-1')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      }),
    };
    const supabaseClient = { from: vi.fn().mockReturnValue(updateChain) };
    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    await expect(deleteAttachment('att-1')).rejects.toThrow('Failed to delete attachment');
  });
});

// ============================================================
// getAttachmentSignedUrl
// ============================================================
describe('getAttachmentSignedUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns signed URL', async () => {
    const supabaseClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://signed.url/file' },
            error: null,
          }),
        }),
      },
    };
    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    const url = await getAttachmentSignedUrl('rfi/rfi-1/123-drawing.pdf');
    expect(url).toBe('https://signed.url/file');
  });

  it('throws on storage error', async () => {
    const supabaseClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Bucket not found' },
          }),
        }),
      },
    };
    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    await expect(getAttachmentSignedUrl('bad/path.pdf')).rejects.toThrow(
      'Failed to create signed URL',
    );
  });
});

// ============================================================
// createDistributionLog
// ============================================================
describe('createDistributionLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts distribution records and returns them', async () => {
    const insertChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [sampleDistLog], error: null }),
      }),
    };
    const supabaseClient = { from: vi.fn().mockReturnValue(insertChain) };
    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    const recipients = [
      {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'engineer@firm.com',
        name: 'Alex Engineer',
      },
    ];

    const result = await createDistributionLog('sub-1', recipients);
    expect(result).toHaveLength(1);
    expect(result[0].recipient_email).toBe('engineer@firm.com');
    expect(result[0].status).toBe('sent');
  });

  it('throws on DB error', async () => {
    const insertChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      }),
    };
    const supabaseClient = { from: vi.fn().mockReturnValue(insertChain) };
    mockCreateServiceClient.mockReturnValue(supabaseClient as never);

    await expect(
      createDistributionLog('sub-1', [
        {
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'e@example.com',
          name: 'Test',
        },
      ]),
    ).rejects.toThrow('Failed to create distribution log');
  });
});

// ============================================================
// getDistributionLog
// ============================================================
describe('getDistributionLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns distribution entries', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { submittal_distributions: { data: [sampleDistLog], error: null } },
      }),
      error: null,
    });

    const result = await getDistributionLog('sub-1');
    expect(result).toHaveLength(1);
    expect(result[0].recipient_name).toBe('Alex Engineer');
  });

  it('throws when auth fails', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: null,
      error: { status: 401 } as never,
    });

    await expect(getDistributionLog('sub-1')).rejects.toThrow('Authentication required');
  });
});
