import { describe, expect, it } from 'vitest';

import {
  calculatePipelineAging,
  calculateRepPerformance,
  calculateWinLossAnalysis,
  RepOpportunityData,
} from '@/lib/crm/pipeline-intelligence';

function makeOpp(overrides: Partial<RepOpportunityData> = {}): RepOpportunityData {
  return {
    id: 'opp-1',
    stage: 'intake',
    estimated_revenue: 100000,
    owner_user_id: 'user-a',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('calculateRepPerformance', () => {
  it('returns empty array for no data', () => {
    expect(calculateRepPerformance([])).toEqual([]);
  });

  it('calculates deals won, lost, and open per rep', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: 'rep-1' }),
      makeOpp({ id: '2', stage: 'closed_lost', owner_user_id: 'rep-1' }),
      makeOpp({ id: '3', stage: 'intake', owner_user_id: 'rep-1' }),
    ];

    const result = calculateRepPerformance(opps);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      user_id: 'rep-1',
      deals_won: 1,
      deals_lost: 1,
      deals_open: 1,
    });
  });

  it('calculates revenue and conversion rate', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: 'rep-1', estimated_revenue: 200000 }),
      makeOpp({ id: '2', stage: 'contracted', owner_user_id: 'rep-1', estimated_revenue: 300000 }),
      makeOpp({ id: '3', stage: 'closed_lost', owner_user_id: 'rep-1', estimated_revenue: 100000 }),
    ];

    const result = calculateRepPerformance(opps);
    expect(result[0]).toMatchObject({
      user_id: 'rep-1',
      revenue_closed: 500000,
      conversion_rate: 2 / 3, // 2 won out of 3 terminal
      avg_deal_size: 250000, // 500000 / 2 won
    });
  });

  it('sorts by revenue descending', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: 'rep-low', estimated_revenue: 50000 }),
      makeOpp({
        id: '2',
        stage: 'contracted',
        owner_user_id: 'rep-high',
        estimated_revenue: 500000,
      }),
    ];

    const result = calculateRepPerformance(opps);
    expect(result[0].user_id).toBe('rep-high');
    expect(result[1].user_id).toBe('rep-low');
  });

  it('groups unassigned deals under "unassigned"', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: null, estimated_revenue: 100000 }),
      makeOpp({ id: '2', stage: 'intake', owner_user_id: null }),
    ];

    const result = calculateRepPerformance(opps);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      user_id: 'unassigned',
      deals_won: 1,
      deals_open: 1,
    });
  });

  it('handles null estimated_revenue as 0', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: 'rep-1', estimated_revenue: null }),
    ];

    const result = calculateRepPerformance(opps);
    expect(result[0].revenue_closed).toBe(0);
    expect(result[0].avg_deal_size).toBe(0);
  });
});

describe('calculatePipelineAging', () => {
  it('returns empty for no active deals', () => {
    expect(calculatePipelineAging([])).toEqual([]);
  });

  it('returns empty when all deals are terminal', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted' }),
      makeOpp({ id: '2', stage: 'closed_lost' }),
    ];

    expect(calculatePipelineAging(opps)).toEqual([]);
  });

  it('calculates average days in stage', () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'proposal', updated_at: tenDaysAgo }),
      makeOpp({ id: '2', stage: 'proposal', updated_at: twentyDaysAgo }),
    ];

    const result = calculatePipelineAging(opps);
    expect(result).toHaveLength(1);
    expect(result[0].stage).toBe('proposal');
    expect(result[0].count).toBe(2);
    // Average of ~10 and ~20 days = ~15
    expect(result[0].avg_days).toBeGreaterThanOrEqual(14);
    expect(result[0].avg_days).toBeLessThanOrEqual(16);
  });

  it('identifies stalled deals (>14 days default)', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'negotiation', updated_at: fiveDaysAgo }),
      makeOpp({ id: '2', stage: 'negotiation', updated_at: twentyDaysAgo }),
    ];

    const result = calculatePipelineAging(opps);
    expect(result[0].stalled_count).toBe(1); // only the 20-day one is stalled
  });

  it('custom threshold works', () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'proposal', updated_at: tenDaysAgo }),
    ];

    // Default threshold (14): not stalled
    const resultDefault = calculatePipelineAging(opps);
    expect(resultDefault[0].stalled_count).toBe(0);

    // Custom threshold (7): stalled
    const resultCustom = calculatePipelineAging(opps, 7);
    expect(resultCustom[0].stalled_count).toBe(1);
  });

  it('excludes terminal stages (contracted & closed_lost)', () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', updated_at: thirtyDaysAgo }),
      makeOpp({ id: '2', stage: 'closed_lost', updated_at: thirtyDaysAgo }),
      makeOpp({ id: '3', stage: 'intake', updated_at: thirtyDaysAgo }),
    ];

    const result = calculatePipelineAging(opps);
    expect(result).toHaveLength(1);
    expect(result[0].stage).toBe('intake');
  });
});

describe('calculateWinLossAnalysis', () => {
  it('returns empty for no terminal deals', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'intake' }),
      makeOpp({ id: '2', stage: 'proposal' }),
    ];

    const result = calculateWinLossAnalysis(opps, (o) => o.owner_user_id ?? 'unassigned');
    expect(result).toEqual([]);
  });

  it('returns empty for empty input', () => {
    const result = calculateWinLossAnalysis([], (o) => o.owner_user_id ?? 'unassigned');
    expect(result).toEqual([]);
  });

  it('calculates win rate per dimension', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: 'rep-1' }),
      makeOpp({ id: '2', stage: 'contracted', owner_user_id: 'rep-1' }),
      makeOpp({ id: '3', stage: 'closed_lost', owner_user_id: 'rep-1' }),
      makeOpp({ id: '4', stage: 'contracted', owner_user_id: 'rep-2' }),
      makeOpp({ id: '5', stage: 'closed_lost', owner_user_id: 'rep-2' }),
    ];

    const result = calculateWinLossAnalysis(opps, (o) => o.owner_user_id ?? 'unassigned');

    const rep1 = result.find((r) => r.dimension === 'rep-1')!;
    expect(rep1.won).toBe(2);
    expect(rep1.lost).toBe(1);
    expect(rep1.total).toBe(3);
    expect(rep1.win_rate).toBeCloseTo(2 / 3);

    const rep2 = result.find((r) => r.dimension === 'rep-2')!;
    expect(rep2.won).toBe(1);
    expect(rep2.lost).toBe(1);
    expect(rep2.total).toBe(2);
    expect(rep2.win_rate).toBe(0.5);
  });

  it('sorts by total deals descending', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted', owner_user_id: 'rep-few' }),
      makeOpp({ id: '2', stage: 'contracted', owner_user_id: 'rep-many' }),
      makeOpp({ id: '3', stage: 'closed_lost', owner_user_id: 'rep-many' }),
      makeOpp({ id: '4', stage: 'contracted', owner_user_id: 'rep-many' }),
    ];

    const result = calculateWinLossAnalysis(opps, (o) => o.owner_user_id ?? 'unassigned');
    expect(result[0].dimension).toBe('rep-many');
    expect(result[1].dimension).toBe('rep-few');
  });

  it('works with a custom dimension function', () => {
    const opps: RepOpportunityData[] = [
      makeOpp({ id: '1', stage: 'contracted' }),
      makeOpp({ id: '2', stage: 'closed_lost' }),
    ];

    const result = calculateWinLossAnalysis(opps, () => 'all');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      dimension: 'all',
      won: 1,
      lost: 1,
      total: 2,
      win_rate: 0.5,
    });
  });
});
