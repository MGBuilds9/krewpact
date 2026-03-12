/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/ai/providers/gemini', () => ({
  generateWithGemini: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { generateWithGemini } from '@/lib/ai/providers/gemini';
import { logger } from '@/lib/logger';
import { detectStaleDeals } from '@/lib/ai/agents/stale-deal-detector';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGenerateWithGemini = vi.mocked(generateWithGemini);

const ORG_ID = '00000000-0000-4000-a000-000000000000';

function mockChain(data: unknown[], error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'eq', 'not', 'lt', 'gt', 'gte', 'is', 'or', 'order', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

function makeDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('detectStaleDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no stale deals found', async () => {
    const chain = mockChain([]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectStaleDeals(ORG_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array on DB error and warns', async () => {
    const chain = mockChain(null as any, { message: 'connection timeout' });
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectStaleDeals(ORG_ID);
    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Stale deal detection failed', { error: 'connection timeout' });
  });

  it('detects deals older than 14 days with correct title format', async () => {
    const staleOpp = {
      id: 'opp-1',
      name: 'Renovation Project',
      stage: 'proposal',
      value: 50000,
      updated_at: makeDaysAgo(14),
    };
    const chain = mockChain([staleOpp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);
    mockGenerateWithGemini.mockResolvedValue('This deal needs follow-up.');

    const result = await detectStaleDeals(ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe('opp-1');
    expect(result[0].insight.title).toMatch(/^Stale deal — \d+ days without activity$/);
    expect(result[0].insight.content).toBe('This deal needs follow-up.');
  });

  it('skips deals in terminal stages (contracted, closed_lost)', async () => {
    // Terminal stages are filtered by the .not() query — so if DB returns nothing, result is empty.
    // We test by confirming the .not() method was called with the correct args.
    const chain = mockChain([]);
    const fromMock = vi.fn().mockReturnValue(chain);
    mockCreateServiceClient.mockReturnValue({ from: fromMock } as any);

    await detectStaleDeals(ORG_ID);

    expect(fromMock).toHaveBeenCalledWith('opportunities');
    expect(chain.not).toHaveBeenCalledWith('stage', 'in', '("contracted","closed_lost")');
  });

  it('uses Gemini for content when Gemini succeeds', async () => {
    const staleOpp = {
      id: 'opp-2',
      name: 'Office Build-Out',
      stage: 'negotiation',
      value: 120000,
      updated_at: makeDaysAgo(20),
    };
    const chain = mockChain([staleOpp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);
    mockGenerateWithGemini.mockResolvedValue('Follow up on this $120K deal immediately.');

    const result = await detectStaleDeals(ORG_ID);

    expect(mockGenerateWithGemini).toHaveBeenCalledTimes(1);
    expect(result[0].insight.content).toBe('Follow up on this $120K deal immediately.');
  });

  it('falls back to template content when Gemini fails', async () => {
    const staleOpp = {
      id: 'opp-3',
      name: 'Warehouse Expansion',
      stage: 'estimating',
      value: null,
      updated_at: makeDaysAgo(18),
    };
    const chain = mockChain([staleOpp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);
    mockGenerateWithGemini.mockRejectedValue(new Error('API quota exceeded'));

    const result = await detectStaleDeals(ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].insight.content).toMatch(/hasn't been updated in \d+ days/);
    expect(result[0].insight.content).toMatch(/Consider following up/);
  });

  it('confidence is > 0.7 for 14-day stale deal', async () => {
    const staleOpp = {
      id: 'opp-4',
      name: 'Test Deal',
      stage: 'proposal',
      value: 5000,
      updated_at: makeDaysAgo(14),
    };
    const chain = mockChain([staleOpp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);
    mockGenerateWithGemini.mockResolvedValue('Test.');

    const result = await detectStaleDeals(ORG_ID);

    expect(result[0].insight.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('confidence is higher for 28-day stale deal than 14-day stale deal', async () => {
    const deal14 = {
      id: 'opp-14',
      name: 'Deal 14',
      stage: 'proposal',
      value: 1000,
      updated_at: makeDaysAgo(14),
    };
    const deal28 = {
      id: 'opp-28',
      name: 'Deal 28',
      stage: 'proposal',
      value: 1000,
      updated_at: makeDaysAgo(28),
    };

    const chain14 = mockChain([deal14]);
    const chain28 = mockChain([deal28]);
    mockGenerateWithGemini.mockResolvedValue('Test.');

    mockCreateServiceClient.mockReturnValueOnce({ from: vi.fn().mockReturnValue(chain14) } as any);
    const result14 = await detectStaleDeals(ORG_ID);

    mockCreateServiceClient.mockReturnValueOnce({ from: vi.fn().mockReturnValue(chain28) } as any);
    const result28 = await detectStaleDeals(ORG_ID);

    expect(result28[0].insight.confidence).toBeGreaterThan(result14[0].insight.confidence);
  });
});
