import { describe, it, expect } from 'vitest';
import {
  calculatePipelineMetrics,
  calculateConversionMetrics,
  calculateVelocityMetrics,
  calculateSourceMetrics,
  type OpportunityData,
  type LeadData,
} from '@/lib/crm/metrics';

function makeOpp(overrides: Partial<OpportunityData> = {}): OpportunityData {
  return {
    id: `opp-${Math.random().toString(36).slice(2, 8)}`,
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
    id: `lead-${Math.random().toString(36).slice(2, 8)}`,
    stage: 'new',
    source: 'Website',
    estimated_value: 25000,
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
    const opps = [
      makeOpp({ estimated_revenue: null, probability_pct: null }),
    ];
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
      makeLead({ stage: 'new' }),
      makeLead({ stage: 'qualified' }),
      makeLead({ stage: 'converted' }),
      makeLead({ stage: 'lost' }),
    ];
    const result = calculateConversionMetrics(leads);
    expect(result.totalLeads).toBe(4);
    expect(result.qualifiedLeads).toBe(2); // qualified + converted
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
    const opps = [
      makeOpp({ stage: 'proposal', estimated_revenue: 999999 }),
    ];
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
      makeLead({ source: 'Website', stage: 'new', estimated_value: 10000 }),
      makeLead({ source: 'Website', stage: 'converted', estimated_value: 20000 }),
      makeLead({ source: 'Referral', stage: 'qualified', estimated_value: 50000 }),
    ];
    const result = calculateSourceMetrics(leads);
    expect(result.sources).toHaveLength(2);

    const website = result.sources.find((s) => s.source === 'Website');
    expect(website?.count).toBe(2);
    expect(website?.value).toBe(30000);
    expect(website?.conversionRate).toBe(0.5);

    const referral = result.sources.find((s) => s.source === 'Referral');
    expect(referral?.count).toBe(1);
    expect(referral?.conversionRate).toBe(0);
  });

  it('sorts sources by value descending', () => {
    const leads = [
      makeLead({ source: 'Low', estimated_value: 1000 }),
      makeLead({ source: 'High', estimated_value: 100000 }),
    ];
    const result = calculateSourceMetrics(leads);
    expect(result.sources[0].source).toBe('High');
    expect(result.sources[1].source).toBe('Low');
  });

  it('handles null source as Unknown', () => {
    const leads = [makeLead({ source: null })];
    const result = calculateSourceMetrics(leads);
    expect(result.sources[0].source).toBe('Unknown');
  });
});
