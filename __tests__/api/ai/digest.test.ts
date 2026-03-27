import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi
      .fn()
      .mockReturnValue({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/ai/digest/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { mockClerkAuth, mockClerkUnauth } from '../../helpers/mock-auth';
import { makeRequest } from '../../helpers/mock-request';
import { mockSupabaseClient } from '../../helpers/mock-supabase';

describe('GET /api/ai/digest', () => {
  const mockAuth = vi.mocked(auth);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user_test_123');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);

    const req = makeRequest('/api/ai/digest');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns digest for current user', async () => {
    const today = new Date().toISOString().split('T')[0];
    const digestData = {
      id: 'digest-1',
      digest_date: today,
      sections: [{ title: 'Tasks Due Today', items: [{ label: 'Fix roof', value: 'pending' }] }],
      summary: 'You have 1 task due today.',
      email_sent_at: null,
      read_at: '2026-03-12T08:00:00Z', // already read — no update needed
      created_at: '2026-03-12T07:00:00Z',
    };

    const supabase = mockSupabaseClient({
      tables: { user_digests: { data: digestData, error: null } },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest('/api/ai/digest');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.digest).toBeDefined();
    expect(body.digest.id).toBe('digest-1');
    expect(body.digest.summary).toBe('You have 1 task due today.');
    expect(Array.isArray(body.digest.sections)).toBe(true);
  });

  it('returns null when no digest exists today (PGRST116 code)', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        user_digests: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest('/api/ai/digest');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.digest).toBeNull();
  });

  it('marks read_at on first fetch when not yet read', async () => {
    const today = new Date().toISOString().split('T')[0];
    const digestData = {
      id: 'digest-unread',
      digest_date: today,
      sections: [],
      summary: 'Nothing urgent today.',
      email_sent_at: null,
      read_at: null, // not yet read
      created_at: '2026-03-12T07:00:00Z',
    };

    const updateChain: any = {};
    updateChain.update = vi.fn().mockReturnValue(updateChain);
    updateChain.eq = vi.fn().mockReturnValue(updateChain);
    updateChain.then = (resolve: any) => resolve({ data: null, error: null });

    // Track update call
    let updateCalled = false;
    const supabase: any = {
      from: vi.fn().mockImplementation((_table: string) => {
        const chain: any = {};
        const methods = ['select', 'eq', 'neq', 'order', 'limit', 'insert'];
        for (const m of methods) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi
          .fn()
          .mockImplementation(() => Promise.resolve({ data: digestData, error: null }));
        chain.update = vi.fn().mockImplementation(() => {
          updateCalled = true;
          return updateChain;
        });
        chain.then = (resolve: any) => resolve({ data: digestData, error: null });
        return chain;
      }),
    };
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest('/api/ai/digest');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.digest).toBeDefined();
    expect(body.digest.id).toBe('digest-unread');
    // update should have been called to set read_at
    expect(updateCalled).toBe(true);
  });

  it('returns 500 on unexpected supabase error', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        user_digests: { data: null, error: { code: 'UNKNOWN', message: 'Connection refused' } },
      },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest('/api/ai/digest');
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
