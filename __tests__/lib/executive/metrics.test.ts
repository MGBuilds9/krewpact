import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  computeEstimatingVelocity,
  computePipelineSummary,
  computeProjectPortfolio,
  computeSubscriptionSummary,
} from '@/lib/executive/metrics';

function mockSupabase(rpcData: Record<string, unknown[]>) {
  return {
    rpc: vi.fn((name: string) => Promise.resolve({ data: rpcData[name] ?? [], error: null })),
  } as unknown as SupabaseClient;
}

describe('computePipelineSummary', () => {
  it('returns correct totals, stage breakdown, and win rate', async () => {
    const supabase = mockSupabase({
      get_pipeline_summary: [
        { stage: 'closed_won', count: 2, value: 30000 },
        { stage: 'proposal', count: 1, value: 5000 },
        { stage: 'lead', count: 1, value: 15000 },
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
    const supabase = mockSupabase({ get_pipeline_summary: [] });

    const result = await computePipelineSummary(supabase);

    expect(result.totalValue).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.avgDealSize).toBe(0);
    expect(result.stageBreakdown).toHaveLength(0);
  });

  it('handles no closed_won stage gracefully', async () => {
    const supabase = mockSupabase({
      get_pipeline_summary: [
        { stage: 'lead', count: 1, value: 0 },
        { stage: 'proposal', count: 1, value: 5000 },
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
      get_project_portfolio: [
        { status: 'active', count: 3 },
        { status: 'completed', count: 1 },
        { status: 'on_hold', count: 1 },
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
    const supabase = mockSupabase({ get_project_portfolio: [] });

    const result = await computeProjectPortfolio(supabase);

    expect(result.activeCount).toBe(0);
    expect(result.statusBreakdown).toHaveLength(0);
  });
});

describe('computeEstimatingVelocity', () => {
  it('returns correct totals and status breakdown', async () => {
    const supabase = mockSupabase({
      get_estimating_velocity: [
        { status: 'draft', count: 2 },
        { status: 'sent', count: 1 },
        { status: 'approved', count: 1 },
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
    const supabase = mockSupabase({ get_estimating_velocity: [] });

    const result = await computeEstimatingVelocity(supabase);

    expect(result.totalEstimates).toBe(0);
    expect(result.statusBreakdown).toHaveLength(0);
  });
});

describe('computeSubscriptionSummary', () => {
  it('returns correct summary from RPC row', async () => {
    const supabase = mockSupabase({
      get_subscription_summary: [
        { total_monthly: 298.99, active_count: 2, expiring_soon_count: 1 },
      ],
    });

    const result = await computeSubscriptionSummary(supabase);

    expect(result.activeCount).toBe(2);
    expect(result.totalMonthlyCost).toBeCloseTo(298.99, 2);
    expect(result.upcomingRenewals).toBe(1);
  });

  it('handles empty subscriptions', async () => {
    const supabase = mockSupabase({ get_subscription_summary: [] });

    const result = await computeSubscriptionSummary(supabase);

    expect(result.activeCount).toBe(0);
    expect(result.totalMonthlyCost).toBe(0);
    expect(result.upcomingRenewals).toBe(0);
  });

  it('handles zero active subscriptions', async () => {
    const supabase = mockSupabase({
      get_subscription_summary: [{ total_monthly: 0, active_count: 0, expiring_soon_count: 0 }],
    });

    const result = await computeSubscriptionSummary(supabase);

    expect(result.activeCount).toBe(0);
    expect(result.totalMonthlyCost).toBe(0);
    expect(result.upcomingRenewals).toBe(0);
  });
});
