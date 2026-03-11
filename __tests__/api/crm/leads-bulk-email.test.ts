import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { POST } from '@/app/api/crm/leads/bulk-email/route';

function mockChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  chain.select = handler;
  chain.eq = handler;
  chain.in = handler;
  chain.insert = handler;
  chain.update = handler;
  chain.not = handler;
  chain.is = handler;
  chain.single = handler;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/crm/leads/bulk-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/crm/leads/bulk-email', () => {
  const leadId1 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const leadId2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1' });
  });

  it('returns 401 if unauthenticated', async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ lead_ids: [leadId1], subject: 'Hi', html: '<p>Hi</p>' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 if lead_ids is empty', async () => {
    const res = await POST(makeRequest({ lead_ids: [], subject: 'Hi', html: '<p>Hi</p>' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if no contacts have email', async () => {
    const from = vi.fn().mockReturnValue(mockChain({ data: [], error: null }));
    (createUserClientSafe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      client: { from },
      error: null,
    });

    const res = await POST(makeRequest({ lead_ids: [leadId1], subject: 'Hi', html: '<p>Hi</p>' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No contacts with email');
  });

  it('sends emails and returns counts', async () => {
    const contacts = [
      {
        id: 'c-1',
        email: 'alice@test.com',
        first_name: 'Alice',
        last_name: 'Smith',
        lead_id: leadId1,
      },
      { id: 'c-2', email: 'bob@test.com', first_name: 'Bob', last_name: 'Jones', lead_id: leadId2 },
    ];

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'contacts') return mockChain({ data: contacts, error: null });
      return mockChain({ data: null, error: null });
    });
    (createUserClientSafe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      client: { from },
      error: null,
    });
    (sendEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'msg-1',
      success: true,
    });

    const res = await POST(
      makeRequest({
        lead_ids: [leadId1, leadId2],
        subject: 'Hello {{first_name}}',
        html: '<p>Hello {{first_name}} {{last_name}}</p>',
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
    expect(json.total).toBe(2);
  });

  it('handles sendEmail failures gracefully', async () => {
    const contacts = [
      {
        id: 'c-1',
        email: 'alice@test.com',
        first_name: 'Alice',
        last_name: 'Smith',
        lead_id: leadId1,
      },
      { id: 'c-2', email: 'bob@test.com', first_name: 'Bob', last_name: 'Jones', lead_id: leadId2 },
    ];

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'contacts') return mockChain({ data: contacts, error: null });
      return mockChain({ data: null, error: null });
    });
    (createUserClientSafe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      client: { from },
      error: null,
    });

    (sendEmail as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'msg-1', success: true })
      .mockResolvedValueOnce({ id: '', success: false, error: 'Bounced' });

    const res = await POST(
      makeRequest({
        lead_ids: [leadId1, leadId2],
        subject: 'Hi',
        html: '<p>Hello</p>',
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(1);
    expect(json.failed).toBe(1);
  });
});
