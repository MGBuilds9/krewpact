import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/ai/agents/stale-deal-detector', () => ({
  detectStaleDeals: vi.fn(),
}));
vi.mock('@/lib/ai/agents/bid-matcher', () => ({
  detectBidMatches: vi.fn(),
}));
vi.mock('@/lib/ai/agents/next-action-suggester', () => ({
  detectNextActions: vi.fn(),
}));
vi.mock('@/lib/ai/agents/budget-anomaly', () => ({
  detectBudgetAnomalies: vi.fn(),
}));

import { detectBidMatches } from '@/lib/ai/agents/bid-matcher';
import { detectBudgetAnomalies } from '@/lib/ai/agents/budget-anomaly';
import { generateInsights } from '@/lib/ai/agents/insight-engine';
import { detectNextActions } from '@/lib/ai/agents/next-action-suggester';
import { detectStaleDeals } from '@/lib/ai/agents/stale-deal-detector';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockDetectStaleDeals = vi.mocked(detectStaleDeals);
const mockDetectBidMatches = vi.mocked(detectBidMatches);
const mockDetectNextActions = vi.mocked(detectNextActions);
const mockDetectBudgetAnomalies = vi.mocked(detectBudgetAnomalies);

const ORG_ID = '00000000-0000-4000-a000-000000000000';

function mockChain(data: unknown[], error: unknown = null) {
  const chain: any = {};
  const methods = [
    'select',
    'eq',
    'not',
    'lt',
    'gt',
    'gte',
    'is',
    'or',
    'order',
    'limit',
    'insert',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

function makeInsightResult(entityId: string, entityType: 'opportunity' | 'lead' = 'opportunity') {
  return {
    entityId,
    entityType,
    insight: {
      title: `Test insight for ${entityId}`,
      content: `Content for ${entityId}`,
      confidence: 0.8,
      actionUrl: null,
      actionLabel: null,
      metadata: {},
    },
  };
}

function buildSupabaseMock(existingInsights: unknown[], insertError: unknown = null) {
  const existingChain: any = {};
  const existingMethods = ['select', 'eq', 'is'];
  for (const m of existingMethods) {
    existingChain[m] = vi.fn().mockReturnValue(existingChain);
  }
  existingChain.then = (resolve: any) => resolve({ data: existingInsights, error: null });

  const insertChain: any = {};
  insertChain.insert = vi.fn().mockReturnValue({
    then: (resolve: any) => resolve({ data: null, error: insertError }),
  });

  return vi.fn().mockImplementation((table: string) => {
    if (table === 'ai_insights') {
      // Return a chain that can handle both select and insert
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(existingChain);
      chain.insert = vi.fn().mockReturnValue({
        then: (resolve: any) => resolve({ data: null, error: insertError }),
      });
      return chain;
    }
    return mockChain([]);
  });
}

describe('generateInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zeros when all detectors return empty arrays', async () => {
    mockDetectStaleDeals.mockResolvedValue([]);
    mockDetectBidMatches.mockResolvedValue([]);
    mockDetectNextActions.mockResolvedValue([]);
    mockDetectBudgetAnomalies.mockResolvedValue([]);

    mockCreateServiceClient.mockReturnValue({ from: buildSupabaseMock([]) } as any);

    const result = await generateInsights(ORG_ID);

    expect(result).toEqual({ generated: 0, skipped: 0, errors: 0 });
  });

  it('inserts new insights when detectors return results', async () => {
    mockDetectStaleDeals.mockResolvedValue([makeInsightResult('opp-1') as any]);
    mockDetectBidMatches.mockResolvedValue([]);
    mockDetectNextActions.mockResolvedValue([]);
    mockDetectBudgetAnomalies.mockResolvedValue([]);

    const fromFn = buildSupabaseMock([]);
    mockCreateServiceClient.mockReturnValue({ from: fromFn } as any);

    const result = await generateInsights(ORG_ID);

    expect(result.generated).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('deduplicates against existing active insights', async () => {
    mockDetectStaleDeals.mockResolvedValue([makeInsightResult('opp-1') as any]);
    mockDetectBidMatches.mockResolvedValue([makeInsightResult('lead-1', 'lead') as any]);
    mockDetectNextActions.mockResolvedValue([]);
    mockDetectBudgetAnomalies.mockResolvedValue([]);

    // opp-1 stale_deal already exists → skipped
    const existing = [
      { entity_type: 'opportunity', entity_id: 'opp-1', insight_type: 'stale_deal' },
    ];

    const fromFn = buildSupabaseMock(existing);
    mockCreateServiceClient.mockReturnValue({ from: fromFn } as any);

    const result = await generateInsights(ORG_ID);

    expect(result.generated).toBe(1); // lead-1 bid_match is new
    expect(result.skipped).toBe(1); // opp-1 stale_deal is duplicate
    expect(result.errors).toBe(0);
  });

  it('handles detector failures gracefully and counts errors', async () => {
    mockDetectStaleDeals.mockRejectedValue(new Error('Gemini quota exceeded'));
    mockDetectBidMatches.mockResolvedValue([]);
    mockDetectNextActions.mockResolvedValue([]);
    mockDetectBudgetAnomalies.mockResolvedValue([]);

    mockCreateServiceClient.mockReturnValue({ from: buildSupabaseMock([]) } as any);

    const result = await generateInsights(ORG_ID);

    expect(result.errors).toBe(1);
    expect(result.generated).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      'Stale deal detector failed',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('counts errors for all four failing detectors', async () => {
    mockDetectStaleDeals.mockRejectedValue(new Error('fail1'));
    mockDetectBidMatches.mockRejectedValue(new Error('fail2'));
    mockDetectNextActions.mockRejectedValue(new Error('fail3'));
    mockDetectBudgetAnomalies.mockRejectedValue(new Error('fail4'));

    mockCreateServiceClient.mockReturnValue({ from: buildSupabaseMock([]) } as any);

    const result = await generateInsights(ORG_ID);

    expect(result.errors).toBe(4);
    expect(result.generated).toBe(0);
  });

  it('sets 7-day expiry on inserted insights', async () => {
    mockDetectStaleDeals.mockResolvedValue([makeInsightResult('opp-42') as any]);
    mockDetectBidMatches.mockResolvedValue([]);
    mockDetectNextActions.mockResolvedValue([]);
    mockDetectBudgetAnomalies.mockResolvedValue([]);

    let capturedRows: any[] | null = null;

    const chain: any = {};
    chain.select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    });
    chain.insert = vi.fn().mockImplementation((rows: any[]) => {
      capturedRows = rows;
      return { then: (resolve: any) => resolve({ data: null, error: null }) };
    });

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as any);

    await generateInsights(ORG_ID);

    expect(capturedRows).not.toBeNull();
    expect(capturedRows![0]).toHaveProperty('expires_at');

    const expiresAt = new Date(capturedRows![0].expires_at).getTime();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // expires_at should be ~7 days from now (within 5 seconds tolerance)
    expect(expiresAt).toBeGreaterThan(now + sevenDaysMs - 5000);
    expect(expiresAt).toBeLessThan(now + sevenDaysMs + 5000);
  });

  it('returns error count when insert fails', async () => {
    mockDetectStaleDeals.mockResolvedValue([makeInsightResult('opp-1') as any]);
    mockDetectBidMatches.mockResolvedValue([]);
    mockDetectNextActions.mockResolvedValue([]);
    mockDetectBudgetAnomalies.mockResolvedValue([]);

    const chain: any = {};
    chain.select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    });
    chain.insert = vi.fn().mockReturnValue({
      then: (resolve: any) => resolve({ data: null, error: { message: 'insert failed' } }),
    });

    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any);

    const result = await generateInsights(ORG_ID);

    expect(result.generated).toBe(0);
    expect(result.errors).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('Failed to insert insights', {
      error: 'insert failed',
    });
  });
});
