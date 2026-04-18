import { describe, expect, it } from 'vitest';

import {
  calculateConversionMetrics,
  calculateForecastMetrics,
  calculatePipelineMetrics,
  calculateSourceMetrics,
  calculateVelocityMetrics,
  type ForecastOpportunityData,
  type LeadData,
  type OpportunityData,
} from '@/lib/crm/metrics';

function makeOpp(overrides: Partial<OpportunityData> = {}): OpportunityData {
  return {
    id: `opp-${crypto.randomUUID()}`,
    stage: 'proposal',
    estimated_revenue: 50000,
    probability_pct: 50,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

function makeLead(overrides: Partial<LeadData> = {}): LeadData {
  return {
    id: `lead-${crypto.randomUUID()}`,
    status: 'new',
    source_channel: 'Website',
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('calculatePipelineMetrics', () => {
  it('returns zeros for empty input', () => {
    const result = calculatePipelineMetrics([]);
    expect(result.totalPipelineValue).toBe(0);
    expect(result.weightedPipelineValue).toBe(0);
    expect(result.opportunityCount).toBe(0);
    expect(result.averageDealSize).toBe(0);
  });

  it('calculates total and weighted pipeline values', () => {
    const opps = [
      makeOpp({ estimated_revenue: 100000, probability_pct: 80 }),
      makeOpp({ estimated_revenue: 50000, probability_pct: 40 }),
    ];
    const result = calculatePipelineMetrics(opps);
    expect(result.totalPipelineValue).toBe(150000);
    expect(result.weightedPipelineValue).toBe(100000);
    expect(result.opportunityCount).toBe(2);
    expect(result.averageDealSize).toBe(75000);
  });

  it('excludes terminal stages from active pipeline', () => {
    const opps = [
      makeOpp({ stage: 'proposal', estimated_revenue: 100000 }),
      makeOpp({ stage: 'contracted', estimated_revenue: 200000 }),
      makeOpp({ stage: 'closed_lost', estimated_revenue: 50000 }),
    ];
    const result = calculatePipelineMetrics(opps);
    expect(result.totalPipelineValue).toBe(100000);
    expect(result.opportunityCount).toBe(1);
  });

  it('provides stage breakdown', () => {
    const opps = [
      makeOpp({ stage: 'intake', estimated_revenue: 30000, probability_pct: 10 }),
      makeOpp({ stage: 'intake', estimated_revenue: 20000, probability_pct: 10 }),
      makeOpp({ stage: 'proposal', estimated_revenue: 80000, probability_pct: 60 }),
    ];
    const result = calculatePipelineMetrics(opps);
    const intake = result.stageBreakdown.find((s) => s.stage === 'intake');
    expect(intake?.count).toBe(2);
    expect(intake?.value).toBe(50000);
    expect(intake?.weightedValue).toBe(5000);
  });

  it('handles null revenue and probability', () => {
    const opps = [makeOpp({ estimated_revenue: null, probability_pct: null })];
    const result = calculatePipelineMetrics(opps);
    expect(result.totalPipelineValue).toBe(0);
    expect(result.weightedPipelineValue).toBe(0);
  });
});

describe('calculateConversionMetrics', () => {
  it('returns zeros for empty input', () => {
    const result = calculateConversionMetrics([]);
    expect(result.totalLeads).toBe(0);
    expect(result.conversionRate).toBe(0);
  });

  it('calculates conversion rates correctly', () => {
    const leads = [
      makeLead({ status: 'new' }),
      makeLead({ status: 'qualified' }),
      makeLead({ status: 'won' }),
      makeLead({ status: 'lost' }),
    ];
    const result = calculateConversionMetrics(leads);
    expect(result.totalLeads).toBe(4);
    expect(result.qualifiedLeads).toBe(2); // qualified + won
    expect(result.convertedLeads).toBe(1);
    expect(result.lostLeads).toBe(1);
    expect(result.conversionRate).toBe(0.25);
    expect(result.lossRate).toBe(0.25);
  });
});

describe('calculateVelocityMetrics', () => {
  it('returns zeros for empty input', () => {
    const result = calculateVelocityMetrics([]);
    expect(result.averageDaysToClose).toBe(0);
    expect(result.dealsClosed).toBe(0);
    expect(result.dealsClosedValue).toBe(0);
  });

  it('calculates average days to close for won deals', () => {
    const opps = [
      makeOpp({
        stage: 'contracted',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-31T00:00:00Z',
        estimated_revenue: 100000,
      }),
    ];
    const result = calculateVelocityMetrics(opps);
    expect(result.dealsClosed).toBe(1);
    expect(result.dealsClosedValue).toBe(100000);
    expect(result.averageDaysToClose).toBe(30);
  });

  it('calculates average days per stage from history', () => {
    const opps = [
      makeOpp({
        stage: 'contracted',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-21T00:00:00Z',
        opportunity_stage_history: [
          { from_stage: 'intake', to_stage: 'proposal', created_at: '2026-01-11T00:00:00Z' },
          { from_stage: 'proposal', to_stage: 'contracted', created_at: '2026-01-21T00:00:00Z' },
        ],
      }),
    ];
    const result = calculateVelocityMetrics(opps);
    expect(result.averageDaysInStage['intake']).toBe(10);
    expect(result.averageDaysInStage['proposal']).toBe(10);
  });

  it('ignores non-contracted opportunities', () => {
    const opps = [makeOpp({ stage: 'proposal', estimated_revenue: 999999 })];
    const result = calculateVelocityMetrics(opps);
    expect(result.dealsClosed).toBe(0);
    expect(result.dealsClosedValue).toBe(0);
  });
});

describe('calculateSourceMetrics', () => {
  it('returns empty sources for empty input', () => {
    const result = calculateSourceMetrics([]);
    expect(result.sources).toHaveLength(0);
  });

  it('groups leads by source and calculates conversion rates', () => {
    const leads = [
      makeLead({ source_channel: 'website', status: 'new' }),
      makeLead({ source_channel: 'website', status: 'won' }),
      makeLead({ source_channel: 'referral', status: 'qualified' }),
    ];
    const result = calculateSourceMetrics(leads);
    expect(result.sources).toHaveLength(2);

    const website = result.sources.find((s) => s.source === 'website');
    expect(website?.count).toBe(2);
    expect(website?.value).toBe(0);
    expect(website?.conversionRate).toBe(0.5);

    const referral = result.sources.find((s) => s.source === 'referral');
    expect(referral?.count).toBe(1);
    expect(referral?.conversionRate).toBe(0);
  });

  it('sorts sources by count descending', () => {
    const leads = [
      makeLead({ source_channel: 'other' }),
      makeLead({ source_channel: 'apollo' }),
      makeLead({ source_channel: 'apollo' }),
    ];
    const result = calculateSourceMetrics(leads);
    expect(result.sources[0].source).toBe('apollo');
    expect(result.sources[1].source).toBe('other');
  });

  it('handles null source as Unknown', () => {
    const leads = [makeLead({ source_channel: null })];
    const result = calculateSourceMetrics(leads);
    expect(result.sources[0].source).toBe('Unknown');
  });

  it('categorizes inbound sources correctly', () => {
    const leads = [
      makeLead({ source_channel: 'website' }),
      makeLead({ source_channel: 'referral' }),
      makeLead({ source_channel: 'repeat_client' }),
    ];
    const result = calculateSourceMetrics(leads);
    for (const s of result.sources) {
      expect(s.category).toBe('inbound');
    }
  });

  it('categorizes outbound sources correctly', () => {
    const leads = [
      makeLead({ source_channel: 'apollo' }),
      makeLead({ source_channel: 'cold_outreach' }),
      makeLead({ source_channel: 'door_knocking' }),
      makeLead({ source_channel: 'networking' }),
    ];
    const result = calculateSourceMetrics(leads);
    for (const s of result.sources) {
      expect(s.category).toBe('outbound');
    }
  });

  it('categorizes unknown/other sources as other', () => {
    const leads = [makeLead({ source_channel: 'trade_show' }), makeLead({ source_channel: null })];
    const result = calculateSourceMetrics(leads);
    for (const s of result.sources) {
      expect(s.category).toBe('other');
    }
  });
});

// =====================================================
// Forecast Metrics
// =====================================================

function makeForecastOpp(
  overrides: Partial<ForecastOpportunityData> = {},
): ForecastOpportunityData {
  return {
    id: `opp-${crypto.randomUUID()}`,
    stage: 'proposal',
    estimated_revenue: 100000,
    probability_pct: 50,
    target_close_date: '2026-04-15',
    ...overrides,
  };
}

describe('calculateForecastMetrics', () => {
  // Use mid-month to avoid timezone edge cases
  const now = new Date(2026, 2, 15); // March 15, 2026 in local time

  it('returns empty buckets for empty input', () => {
    const result = calculateForecastMetrics([], now);
    expect(result.totalForecastedRevenue).toBe(0);
    expect(result.totalWeightedRevenue).toBe(0);
    expect(result.buckets).toHaveLength(6);
    expect(result.buckets[0].month).toBe('2026-03');
    expect(result.buckets[5].month).toBe('2026-08');
  });

  it('places opportunities into correct month bucket', () => {
    const opps = [
      makeForecastOpp({
        target_close_date: '2026-03-20',
        estimated_revenue: 50000,
        probability_pct: 80,
      }),
      makeForecastOpp({
        target_close_date: '2026-05-10',
        estimated_revenue: 100000,
        probability_pct: 40,
      }),
    ];
    const result = calculateForecastMetrics(opps, now);

    const mar = result.buckets.find((b) => b.month === '2026-03');
    expect(mar?.dealCount).toBe(1);
    expect(mar?.totalRevenue).toBe(50000);
    expect(mar?.weightedRevenue).toBe(40000); // 50000 * 0.8

    const may = result.buckets.find((b) => b.month === '2026-05');
    expect(may?.dealCount).toBe(1);
    expect(may?.totalRevenue).toBe(100000);
    expect(may?.weightedRevenue).toBe(40000); // 100000 * 0.4
  });

  it('excludes terminal stages (contracted, closed_lost)', () => {
    const opps = [
      makeForecastOpp({
        stage: 'contracted',
        target_close_date: '2026-04-01',
        estimated_revenue: 200000,
      }),
      makeForecastOpp({
        stage: 'closed_lost',
        target_close_date: '2026-04-01',
        estimated_revenue: 100000,
      }),
      makeForecastOpp({
        stage: 'proposal',
        target_close_date: '2026-04-01',
        estimated_revenue: 50000,
      }),
    ];
    const result = calculateForecastMetrics(opps, now);
    expect(result.totalForecastedRevenue).toBe(50000);
  });

  it('excludes opportunities without target_close_date', () => {
    const opps = [
      makeForecastOpp({ target_close_date: null, estimated_revenue: 999999 }),
      makeForecastOpp({ target_close_date: '2026-03-15', estimated_revenue: 10000 }),
    ];
    const result = calculateForecastMetrics(opps, now);
    expect(result.totalForecastedRevenue).toBe(10000);
  });

  it('ignores opportunities outside the forecast window', () => {
    const opps = [makeForecastOpp({ target_close_date: '2027-01-01', estimated_revenue: 500000 })];
    const result = calculateForecastMetrics(opps, now, 6);
    // Falls outside the 6-month window (Mar-Aug 2026), not in any bucket
    const bucketWithDeal = result.buckets.find((b) => b.dealCount > 0);
    expect(bucketWithDeal).toBeUndefined();
    // But still counted in totals (this is current behavior)
    expect(result.totalForecastedRevenue).toBe(500000);
  });

  it('handles null revenue and probability gracefully', () => {
    const opps = [
      makeForecastOpp({
        target_close_date: '2026-04-15',
        estimated_revenue: null,
        probability_pct: null,
      }),
    ];
    const result = calculateForecastMetrics(opps, now);
    const apr = result.buckets.find((b) => b.month === '2026-04');
    expect(apr?.dealCount).toBe(1);
    expect(apr?.totalRevenue).toBe(0);
    expect(apr?.weightedRevenue).toBe(0);
  });

  it('respects custom monthsAhead parameter', () => {
    const result = calculateForecastMetrics([], now, 3);
    expect(result.buckets).toHaveLength(3);
    expect(result.buckets[0].month).toBe('2026-03');
    expect(result.buckets[2].month).toBe('2026-05');
  });
});
