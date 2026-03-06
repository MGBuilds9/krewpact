import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/contacts/merge/route';

function mockChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = handler;
  chain.eq = handler;
  chain.in = handler;
  chain.update = handler;
  chain.single = handler;
  chain.not = handler;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/crm/contacts/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/crm/contacts/merge', () => {
  const primaryId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const secondaryId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1' });
  });

  it('returns 401 if unauthenticated', async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ primary_id: primaryId, secondary_id: secondaryId }));
    expect(res.status).toBe(401);
  });

  it('returns 400 if merging with itself', async () => {
    const res = await POST(makeRequest({ primary_id: primaryId, secondary_id: primaryId }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Cannot merge a contact with itself');
  });

  it('returns 404 if primary contact not found', async () => {
    const from = vi.fn().mockReturnValue(
      mockChain({ data: null, error: { message: 'Not found', code: 'PGRST116' } }),
    );
    (createUserClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ from });

    const res = await POST(makeRequest({ primary_id: primaryId, secondary_id: secondaryId }));
    expect(res.status).toBe(404);
  });

  it('merges contacts successfully', async () => {
    const from = vi.fn();
    let contactSelectCount = 0;
    from.mockImplementation((table: string) => {
      if (table === 'contacts') {
        contactSelectCount++;
        if (contactSelectCount <= 2) {
          const data = contactSelectCount === 1
            ? { id: primaryId, first_name: 'John', last_name: 'Doe', email: 'john@test.com', phone: null, created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null }
            : { id: secondaryId, first_name: 'Johnny', last_name: 'Doe', email: 'johnny@test.com', phone: '555-1234', created_at: '2026-01-02', updated_at: '2026-01-02', deleted_at: null };
          return mockChain({ data, error: null });
        }
        return mockChain({ data: null, error: null });
      }
      return mockChain({ data: null, error: null });
    });
    (createUserClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ from });

    const res = await POST(makeRequest({ primary_id: primaryId, secondary_id: secondaryId }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.primaryId).toBe(primaryId);
    expect(json.mergedFields).toContain('phone');
  });

  it('returns 400 for invalid body', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
