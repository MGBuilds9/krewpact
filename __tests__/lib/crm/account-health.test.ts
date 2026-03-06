import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateAccountHealth,
  determineLifecycleStage,
} from '@/lib/crm/account-health';

describe('calculateAccountHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns inactive grade when there is no activity', () => {
    const result = calculateAccountHealth({
      last_activity_at: null,
      total_opportunities: 0,
      won_opportunities: 0,
      total_revenue: 0,
      active_opportunities: 0,
      last_won_date: null,
    });

    expect(result.grade).toBe('inactive');
    expect(result.score).toBe(0);
    expect(result.factors.recency).toBe(0);
    expect(result.factors.engagement).toBe(0);
    expect(result.factors.revenue).toBe(0);
    expect(result.factors.winRate).toBe(0);
  });

  it('returns excellent grade for recent activity, high revenue, and good win rate', () => {
    const result = calculateAccountHealth({
      last_activity_at: '2026-03-03T10:00:00Z', // 2 days ago → recency 100
      total_opportunities: 5,
      won_opportunities: 4, // 80% win rate → winRate 80
      total_revenue: 1_200_000, // >= 1M → revenue 100
      active_opportunities: 2,
      last_won_date: '2026-02-20T00:00:00Z',
    });

    expect(result.grade).toBe('excellent');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.factors.recency).toBe(100);
    expect(result.factors.revenue).toBe(100);
    expect(result.factors.winRate).toBe(80);
  });

  it('returns at_risk grade for old activity with no revenue', () => {
    const result = calculateAccountHealth({
      last_activity_at: '2025-12-01T00:00:00Z', // ~95 days ago → recency 10
      total_opportunities: 2,
      won_opportunities: 0,
      total_revenue: 0,
      active_opportunities: 0,
      last_won_date: null,
    });

    // recency=10, engagement=min(2*15,60)=30 (no active bonus), revenue=0, winRate=0
    // score = round(10*0.4 + 30*0.2 + 0*0.2 + 0*0.2) = round(4+6) = 10
    expect(result.grade).toBe('inactive');
    expect(result.score).toBeLessThan(20);
  });

  it('returns at_risk for activity around 45 days ago with minimal engagement', () => {
    const result = calculateAccountHealth({
      last_activity_at: '2026-01-19T00:00:00Z', // ~45 days ago → recency 50
      total_opportunities: 1,
      won_opportunities: 0,
      total_revenue: 0,
      active_opportunities: 0,
      last_won_date: null,
    });

    // recency=50, engagement=min(1*15,60)=15, revenue=0, winRate=0
    // score = round(50*0.4 + 15*0.2 + 0 + 0) = round(20+3) = 23
    expect(result.grade).toBe('at_risk');
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.score).toBeLessThan(40);
  });

  it('computes score correctly with known inputs', () => {
    const result = calculateAccountHealth({
      last_activity_at: '2026-02-25T00:00:00Z', // 8 days ago → recency 85
      total_opportunities: 4,
      won_opportunities: 2, // win rate 50% → winRate 50
      total_revenue: 100_000, // → revenue 70
      active_opportunities: 1,
      last_won_date: '2026-02-01T00:00:00Z',
    });

    // engagement: baseScore=min(4*15,60)=60, activeBonus=40, total=min(100,100)=100
    // score = round(85*0.4 + 100*0.2 + 70*0.2 + 50*0.2) = round(34+20+14+10) = 78
    expect(result.score).toBe(78);
    expect(result.grade).toBe('good');
    expect(result.factors.recency).toBe(85);
    expect(result.factors.engagement).toBe(100);
    expect(result.factors.revenue).toBe(70);
    expect(result.factors.winRate).toBe(50);
  });

  it('computes factors correctly for edge cases', () => {
    const result = calculateAccountHealth({
      last_activity_at: '2026-03-05T10:00:00Z', // same day → recency 100
      total_opportunities: 1,
      won_opportunities: 1, // 100% win rate → winRate 100
      total_revenue: 10_000, // → revenue 40
      active_opportunities: 0,
      last_won_date: '2026-03-01T00:00:00Z',
    });

    // engagement: baseScore=min(15,60)=15, activeBonus=0, total=15
    // score = round(100*0.4 + 15*0.2 + 40*0.2 + 100*0.2) = round(40+3+8+20) = 71
    expect(result.score).toBe(71);
    expect(result.grade).toBe('good');
    expect(result.factors.recency).toBe(100);
    expect(result.factors.engagement).toBe(15);
    expect(result.factors.revenue).toBe(40);
    expect(result.factors.winRate).toBe(100);
  });

  it('caps engagement score at 100', () => {
    const result = calculateAccountHealth({
      last_activity_at: '2026-03-04T00:00:00Z',
      total_opportunities: 10, // baseScore=min(150,60)=60, activeBonus=40 → 100
      won_opportunities: 5,
      total_revenue: 500_000,
      active_opportunities: 3,
      last_won_date: null,
    });

    expect(result.factors.engagement).toBe(100);
  });

  it('returns revenue score tiers correctly', () => {
    // $0 → 0
    expect(
      calculateAccountHealth({
        last_activity_at: '2026-03-04T00:00:00Z',
        total_opportunities: 1,
        won_opportunities: 0,
        total_revenue: 0,
        active_opportunities: 0,
        last_won_date: null,
      }).factors.revenue,
    ).toBe(0);

    // $5,000 → 25
    expect(
      calculateAccountHealth({
        last_activity_at: '2026-03-04T00:00:00Z',
        total_opportunities: 1,
        won_opportunities: 0,
        total_revenue: 5_000,
        active_opportunities: 0,
        last_won_date: null,
      }).factors.revenue,
    ).toBe(25);

    // $50,000 → 55
    expect(
      calculateAccountHealth({
        last_activity_at: '2026-03-04T00:00:00Z',
        total_opportunities: 1,
        won_opportunities: 0,
        total_revenue: 50_000,
        active_opportunities: 0,
        last_won_date: null,
      }).factors.revenue,
    ).toBe(55);
  });
});

describe('determineLifecycleStage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns lead when there is no activity at all', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 0,
      active_opportunities: 0,
      last_activity_at: null,
      total_revenue: 0,
    });

    expect(stage).toBe('lead');
  });

  it('returns prospect when there are active opportunities but no wins', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 0,
      active_opportunities: 2,
      last_activity_at: '2026-03-01T00:00:00Z',
      total_revenue: 0,
    });

    expect(stage).toBe('prospect');
  });

  it('returns active_client for exactly 1 won opportunity', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 1,
      active_opportunities: 0,
      last_activity_at: '2026-03-01T00:00:00Z',
      total_revenue: 100_000,
    });

    expect(stage).toBe('active_client');
  });

  it('returns repeat_client for 2+ won opportunities', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 3,
      active_opportunities: 1,
      last_activity_at: '2026-03-01T00:00:00Z',
      total_revenue: 500_000,
    });

    expect(stage).toBe('repeat_client');
  });

  it('returns churned for inactive client with 180+ days no activity and no active opps', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 2,
      active_opportunities: 0,
      last_activity_at: '2025-08-01T00:00:00Z', // ~217 days ago
      total_revenue: 200_000,
    });

    expect(stage).toBe('churned');
  });

  it('does not return churned if client has active opportunities despite old activity', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 2,
      active_opportunities: 1,
      last_activity_at: '2025-08-01T00:00:00Z', // 217 days ago but has active opp
      total_revenue: 200_000,
    });

    // Has 2+ wins and active opps, so not churned → repeat_client
    expect(stage).toBe('repeat_client');
  });

  it('does not return churned if there are no won opportunities', () => {
    const stage = determineLifecycleStage({
      won_opportunities: 0,
      active_opportunities: 0,
      last_activity_at: '2025-06-01T00:00:00Z', // very old, but never won
      total_revenue: 0,
    });

    // No won opps → churn check fails, falls through to lead
    expect(stage).toBe('lead');
  });
});
