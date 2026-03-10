import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computePipelineSummary,
  computeProjectPortfolio,
  computeEstimatingVelocity,
  computeSubscriptionSummary,
} from '@/lib/executive/metrics';

function mockSupabase(tableData: Record<string, unknown[]>) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockResolvedValue({ data: tableData[table] ?? [], error: null }),
    })),
  } as unknown as SupabaseClient;
}

describe('computePipelineSummary', () => {
  it('returns correct totals, stage breakdown, and win rate', async () => {
    const supabase = mockSupabase({
      opportunities: [
        { id: '1', stage: 'closed_won', estimated_revenue: 10000 },
        { id: '2', stage: 'closed_won', estimated_revenue: 20000 },
        { id: '3', stage: 'proposal', estimated_revenue: 5000 },
        { id: '4', stage: 'lead', estimated_revenue: 15000 },
      ],
    });

    const result = await computePipelineSummary(supabase);

    expect(result.totalValue).toBe(50000);
    expect(result.winRate).toBe(50); // 2/4 = 50%
    expect(result.avgDealSize).toBe(12500); // 50000 / 4
    expect(result.stageBreakdown).toHaveLength(3);

    const wonStage = result.stageBreakdown.find((s) => s.stage === 'closed_won');
    expect(wonStage).toBeDefined();
    expect(wonStage?.count).toBe(2);
    expect(wonStage?.value).toBe(30000);
  });

  it('handles empty data', async () => {
    const supabase = mockSupabase({ opportunities: [] });

    const result = await computePipelineSummary(supabase);

    expect(result.totalValue).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.avgDealSize).toBe(0);
    expect(result.stageBreakdown).toHaveLength(0);
  });

  it('handles null estimated_revenue gracefully', async () => {
    const supabase = mockSupabase({
      opportunities: [
        { id: '1', stage: 'lead', estimated_revenue: null },
        { id: '2', stage: 'proposal', estimated_revenue: 5000 },
      ],
    });

    const result = await computePipelineSummary(supabase);

    expect(result.totalValue).toBe(5000);
    expect(result.winRate).toBe(0);
    expect(result.avgDealSize).toBe(2500); // 5000 / 2
  });
});

describe('computeProjectPortfolio', () => {
  it('returns correct active count and status breakdown', async () => {
    const supabase = mockSupabase({
      projects: [
        { id: '1', status: 'active' },
        { id: '2', status: 'active' },
        { id: '3', status: 'completed' },
        { id: '4', status: 'on_hold' },
        { id: '5', status: 'active' },
      ],
    });

    const result = await computeProjectPortfolio(supabase);

    expect(result.activeCount).toBe(3);
    expect(result.statusBreakdown).toHaveLength(3);

    const activeStatus = result.statusBreakdown.find((s) => s.status === 'active');
    expect(activeStatus?.count).toBe(3);

    const completedStatus = result.statusBreakdown.find((s) => s.status === 'completed');
    expect(completedStatus?.count).toBe(1);
  });

  it('handles empty projects list', async () => {
    const supabase = mockSupabase({ projects: [] });

    const result = await computeProjectPortfolio(supabase);

    expect(result.activeCount).toBe(0);
    expect(result.statusBreakdown).toHaveLength(0);
  });
});

describe('computeEstimatingVelocity', () => {
  it('returns correct totals and status breakdown', async () => {
    const supabase = mockSupabase({
      estimates: [
        { id: '1', status: 'draft' },
        { id: '2', status: 'sent' },
        { id: '3', status: 'approved' },
        { id: '4', status: 'draft' },
      ],
    });

    const result = await computeEstimatingVelocity(supabase);

    expect(result.totalEstimates).toBe(4);
    expect(result.statusBreakdown).toHaveLength(3);

    const draftStatus = result.statusBreakdown.find((s) => s.status === 'draft');
    expect(draftStatus?.count).toBe(2);

    const approvedStatus = result.statusBreakdown.find((s) => s.status === 'approved');
    expect(approvedStatus?.count).toBe(1);
  });

  it('handles empty estimates list', async () => {
    const supabase = mockSupabase({ estimates: [] });

    const result = await computeEstimatingVelocity(supabase);

    expect(result.totalEstimates).toBe(0);
    expect(result.statusBreakdown).toHaveLength(0);
  });
});

describe('computeSubscriptionSummary', () => {
  it('calculates monthly cost correctly for active subscriptions', async () => {
    const today = new Date();
    const inFiveDays = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const inTenDays = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const supabase = mockSupabase({
      executive_subscriptions: [
        { id: '1', monthly_cost: '99.99', is_active: true, renewal_date: inFiveDays },
        { id: '2', monthly_cost: '199.00', is_active: true, renewal_date: inTenDays },
        { id: '3', monthly_cost: '49.00', is_active: false, renewal_date: inFiveDays },
      ],
    });

    const result = await computeSubscriptionSummary(supabase);

    expect(result.activeCount).toBe(2);
    expect(result.totalMonthlyCost).toBeCloseTo(298.99, 2);
    expect(result.upcomingRenewals).toBe(1); // only inFiveDays is within 7 days and active
  });

  it('handles empty subscriptions', async () => {
    const supabase = mockSupabase({ executive_subscriptions: [] });

    const result = await computeSubscriptionSummary(supabase);

    expect(result.activeCount).toBe(0);
    expect(result.totalMonthlyCost).toBe(0);
    expect(result.upcomingRenewals).toBe(0);
  });

  it('excludes inactive subscriptions from cost and renewals', async () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const supabase = mockSupabase({
      executive_subscriptions: [
        { id: '1', monthly_cost: '500', is_active: false, renewal_date: inThreeDays },
        { id: '2', monthly_cost: '100', is_active: false, renewal_date: inThreeDays },
      ],
    });

    const result = await computeSubscriptionSummary(supabase);

    expect(result.activeCount).toBe(0);
    expect(result.totalMonthlyCost).toBe(0);
    expect(result.upcomingRenewals).toBe(0);
  });
});
