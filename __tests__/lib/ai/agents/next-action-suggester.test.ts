/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { detectNextActions } from '@/lib/ai/agents/next-action-suggester';

const mockCreateServiceClient = vi.mocked(createServiceClient);

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

describe('detectNextActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no opportunities', async () => {
    const chain = mockChain([]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array on DB error and warns', async () => {
    const chain = mockChain(null as any, { message: 'connection timeout' });
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);
    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Next action detection failed', { error: 'connection timeout' });
  });

  it('skips opportunities whose stage has no config', async () => {
    const opp = {
      id: 'opp-unknown',
      name: 'Some Deal',
      stage: 'contracted', // not in STAGE_ACTIONS
      value: 10000,
      updated_at: makeDaysAgo(30),
    };
    const chain = mockChain([opp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);
    expect(result).toEqual([]);
  });

  it('skips opportunities below the threshold days for their stage', async () => {
    // intake threshold = 3 days; 2 days should be skipped
    const opp = {
      id: 'opp-fresh',
      name: 'Fresh Intake',
      stage: 'intake',
      value: 5000,
      updated_at: makeDaysAgo(2),
    };
    const chain = mockChain([opp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);
    expect(result).toEqual([]);
  });

  it('detects opportunity past threshold with correct action text', async () => {
    // proposal threshold = 5 days
    const opp = {
      id: 'opp-1',
      name: 'Community Centre Bid',
      stage: 'proposal',
      value: 80000,
      updated_at: makeDaysAgo(6),
    };
    const chain = mockChain([opp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe('opp-1');
    expect(result[0].insight.content).toContain('Community Centre Bid');
    expect(result[0].insight.content).toContain('proposal');
    expect(result[0].insight.content).toMatch(/\d+ days/);
    expect(result[0].insight.title).toMatch(/^Next step:/);
  });

  it('each stage produces an appropriate action suggestion', async () => {
    const stages = [
      { stage: 'intake', threshold: 3, action: 'site visit' },
      { stage: 'site_visit', threshold: 7, action: 'estimate' },
      { stage: 'estimating', threshold: 10, action: 'proposal' },
      { stage: 'proposal', threshold: 5, action: 'Follow up' },
      { stage: 'negotiation', threshold: 7, action: 'contract' },
    ];

    for (const s of stages) {
      const opp = {
        id: `opp-${s.stage}`,
        name: `Test Deal - ${s.stage}`,
        stage: s.stage,
        value: 10000,
        updated_at: makeDaysAgo(s.threshold + 1),
      };
      const chain = mockChain([opp]);
      mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

      const result = await detectNextActions(ORG_ID);
      expect(result).toHaveLength(1);
      expect(result[0].insight.content.toLowerCase()).toContain(s.action.toLowerCase());
    }
  });

  it('confidence increases with days past threshold', async () => {
    // proposal threshold = 5 days
    const oppJustOver = {
      id: 'opp-just',
      name: 'Just Over',
      stage: 'proposal',
      value: 1000,
      updated_at: makeDaysAgo(6), // 1 day over threshold
    };
    const oppWayOver = {
      id: 'opp-way',
      name: 'Way Over',
      stage: 'proposal',
      value: 1000,
      updated_at: makeDaysAgo(20), // 15 days over threshold
    };

    const chainJust = mockChain([oppJustOver]);
    mockCreateServiceClient.mockReturnValueOnce({ from: vi.fn().mockReturnValue(chainJust) } as any);
    const resultJust = await detectNextActions(ORG_ID);

    const chainWay = mockChain([oppWayOver]);
    mockCreateServiceClient.mockReturnValueOnce({ from: vi.fn().mockReturnValue(chainWay) } as any);
    const resultWay = await detectNextActions(ORG_ID);

    expect(resultWay[0].insight.confidence).toBeGreaterThan(resultJust[0].insight.confidence);
  });

  it('confidence never exceeds 0.95', async () => {
    // proposal threshold = 5; 100 days over should cap at 0.95
    const opp = {
      id: 'opp-ancient',
      name: 'Ancient Deal',
      stage: 'proposal',
      value: 1000,
      updated_at: makeDaysAgo(200),
    };
    const chain = mockChain([opp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);
    expect(result[0].insight.confidence).toBeLessThanOrEqual(0.95);
  });

  it('includes stage and days_in_stage in metadata', async () => {
    const opp = {
      id: 'opp-meta',
      name: 'Metadata Check',
      stage: 'negotiation',
      value: 50000,
      updated_at: makeDaysAgo(10),
    };
    const chain = mockChain([opp]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await detectNextActions(ORG_ID);

    expect(result[0].insight.metadata).toMatchObject({
      stage: 'negotiation',
      days_in_stage: expect.any(Number),
    });
  });
});
