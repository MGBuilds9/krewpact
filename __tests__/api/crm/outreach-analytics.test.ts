import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/outreach/analytics/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function createAnalyticsMock(counts: {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}) {
  let callIndex = 0;
  const countValues = [counts.sent, counts.opened, counts.clicked, counts.replied];

  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'eq', 'gte', 'lte', 'not', 'gt', 'lt', 'neq',
    'order', 'limit', 'range', 'or', 'filter', 'is',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  const fromFn = vi.fn().mockImplementation(() => {
    // Reset chain for each from() call and make it resolve with next count
    const currentCall = callIndex++;
    const resolveChain: Record<string, unknown> = {};
    for (const m of methods) {
      resolveChain[m] = vi.fn().mockReturnValue(resolveChain);
    }
    // select with head:true returns {count}
    resolveChain.select = vi.fn().mockImplementation(() => {
      resolveChain.then = (resolve: (v: unknown) => void) =>
        Promise.resolve(
          resolve({ count: countValues[currentCall] ?? 0, data: null, error: null }),
        );
      return resolveChain;
    });
    return resolveChain;
  });

  return { from: fromFn } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('GET /api/crm/outreach/analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/outreach/analytics'));
    expect(res.status).toBe(401);
  });

  it('returns analytics data with rates', async () => {
    mockClerkAuth(mockAuth);
    const client = createAnalyticsMock({
      sent: 100,
      opened: 30,
      clicked: 8,
      replied: 3,
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/outreach/analytics'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.total_sent).toBe(100);
    expect(body.data.open_rate).toBe(30);
    expect(body.data.click_rate).toBe(8);
    expect(body.data.reply_rate).toBe(3);
  });

  it('returns zero rates when no emails sent', async () => {
    mockClerkAuth(mockAuth);
    const client = createAnalyticsMock({
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/outreach/analytics'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.open_rate).toBe(0);
    expect(body.data.click_rate).toBe(0);
    expect(body.data.reply_rate).toBe(0);
  });
});
