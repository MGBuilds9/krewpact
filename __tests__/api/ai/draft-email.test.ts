process.env.AI_ENABLED = 'true';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/ai/agents/email-drafter', () => ({ draftEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi
      .fn()
      .mockReturnValue({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}));

import { auth } from '@clerk/nextjs/server';

import { POST } from '@/app/api/ai/draft-email/route';
import { draftEmail } from '@/lib/ai/agents/email-drafter';
import { createUserClientSafe } from '@/lib/supabase/server';

import { mockClerkAuth, mockClerkUnauth } from '../../helpers/mock-auth';
import { makeJsonRequest } from '../../helpers/mock-request';
import { mockSupabaseClient } from '../../helpers/mock-supabase';

const mockAuth = vi.mocked(auth);
const mockDraftEmail = vi.mocked(draftEmail);

const ENTITY_ID = '550e8400-e29b-41d4-a716-446655440000';

const DEFAULT_DRAFT = {
  subject: 'Follow Up — MDM Group',
  body: 'Hi there,\n\nJust checking in.\n\nBest,\nMDM',
  to: ['contact@example.com'],
};

describe('POST /api/ai/draft-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user_test_123');
    mockDraftEmail.mockResolvedValue(DEFAULT_DRAFT);

    const supabase = mockSupabaseClient({
      tables: { users: { data: { org_id: 'org-test-1' }, error: null } },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest('/api/ai/draft-email', {
      entity_type: 'lead',
      entity_id: ENTITY_ID,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid body (missing entity_type)', async () => {
    const req = makeJsonRequest('/api/ai/draft-email', {
      entity_id: ENTITY_ID,
      draft_type: 'follow_up',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 for invalid entity_id (not a UUID)', async () => {
    const req = makeJsonRequest('/api/ai/draft-email', {
      entity_type: 'lead',
      entity_id: 'not-a-uuid',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns draft on success', async () => {
    const req = makeJsonRequest('/api/ai/draft-email', {
      entity_type: 'lead',
      entity_id: ENTITY_ID,
      draft_type: 'follow_up',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subject).toBe('Follow Up — MDM Group');
    expect(body.body).toContain('Just checking in');
    expect(body.to).toEqual(['contact@example.com']);
  });

  it('returns 500 when draftEmail throws', async () => {
    mockDraftEmail.mockRejectedValue(new Error('Entity lead/abc not found'));

    const req = makeJsonRequest('/api/ai/draft-email', {
      entity_type: 'lead',
      entity_id: ENTITY_ID,
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to generate email draft');
  });

  it('passes correct parameters to draftEmail', async () => {
    const req = makeJsonRequest('/api/ai/draft-email', {
      entity_type: 'opportunity',
      entity_id: ENTITY_ID,
      draft_type: 'proposal',
      custom_instructions: 'Mention the $75K budget.',
    });
    await POST(req);

    expect(mockDraftEmail).toHaveBeenCalledWith({
      entityType: 'opportunity',
      entityId: ENTITY_ID,
      orgId: 'org-test-1',
      userId: 'user_test_123',
      draftType: 'proposal',
      customInstructions: 'Mention the $75K budget.',
    });
  });
});
