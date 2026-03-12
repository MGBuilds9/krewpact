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
import { detectBidMatches } from '@/lib/ai/agents/bid-matcher';

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

function makeFromWithTables(tableMap: Record<string, ReturnType<typeof mockChain>>) {
  return vi.fn().mockImplementation((table: string) => {
    return tableMap[table] ?? mockChain([]);
  });
}

const sampleLead = {
  id: 'lead-1',
  company_name: 'Skyline Builders',
  industry: 'construction',
  city: 'Toronto',
  province: 'Ontario',
  division_id: 'div-1',
};

const sampleBid = {
  id: 'bid-1',
  title: 'Toronto Community Centre Renovation',
  location: 'Toronto, Ontario',
  industry: 'construction',
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  source: 'merx',
};

describe('detectBidMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateWithGemini.mockResolvedValue('Lead matches this bid — reach out before deadline.');
  });

  it('returns empty array when no leads', async () => {
    const leadsChain = mockChain([]);
    const bidsChain = mockChain([sampleBid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when no bids', async () => {
    const leadsChain = mockChain([sampleLead]);
    const bidsChain = mockChain([]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array and warns when leads query fails', async () => {
    const leadsChain = mockChain(null as any, { message: 'leads DB error' });
    const bidsChain = mockChain([sampleBid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Bid match lead fetch failed', { error: 'leads DB error' });
  });

  it('returns empty array and warns when bids query fails', async () => {
    const leadsChain = mockChain([sampleLead]);
    const bidsChain = mockChain(null as any, { message: 'bids DB error' });
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Bid match bids fetch failed', { error: 'bids DB error' });
  });

  it('matches lead to bid by industry', async () => {
    const lead = { ...sampleLead, city: null, industry: 'construction' };
    const bid = { ...sampleBid, location: 'Ottawa', industry: 'construction services' };
    const leadsChain = mockChain([lead]);
    const bidsChain = mockChain([bid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe('lead-1');
    expect(result[0].insight.title).toContain(bid.title);
  });

  it('matches lead to bid by city/location', async () => {
    const lead = { ...sampleLead, industry: null, city: 'Toronto' };
    const bid = { ...sampleBid, industry: null as any, location: 'Toronto, ON' };
    const leadsChain = mockChain([lead]);
    const bidsChain = mockChain([bid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0].insight.actionLabel).toBe('View Bid');
  });

  it('skips leads without industry or city', async () => {
    const lead = { ...sampleLead, industry: null, city: null };
    const leadsChain = mockChain([lead]);
    const bidsChain = mockChain([sampleBid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toEqual([]);
  });

  it('returns match with correct insight structure', async () => {
    const leadsChain = mockChain([sampleLead]);
    const bidsChain = mockChain([sampleBid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);

    expect(result).toHaveLength(1);
    const insight = result[0].insight;
    expect(insight.title).toBe(`Bid match: ${sampleBid.title}`);
    expect(insight.confidence).toBe(0.8);
    expect(insight.actionLabel).toBe('View Bid');
    expect(insight.metadata).toMatchObject({
      bid_id: sampleBid.id,
      bid_title: sampleBid.title,
      match_count: 1,
    });
  });

  it('uses fallback content when Gemini throws', async () => {
    mockGenerateWithGemini.mockRejectedValue(new Error('quota exceeded'));
    const leadsChain = mockChain([sampleLead]);
    const bidsChain = mockChain([sampleBid]);
    mockCreateServiceClient.mockReturnValue({
      from: makeFromWithTables({ leads: leadsChain, bidding_opportunities: bidsChain }),
    } as any);

    const result = await detectBidMatches(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0].insight.content).toContain('Matches bidding opportunity');
    expect(result[0].insight.content).toContain(sampleBid.title);
  });
});
