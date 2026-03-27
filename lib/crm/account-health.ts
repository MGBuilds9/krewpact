/**
 * Account health score computation.
 * Pure functions — no database or auth dependencies.
 */

export interface AccountHealthInput {
  last_activity_at: string | null;
  total_opportunities: number;
  won_opportunities: number;
  total_revenue: number;
  active_opportunities: number;
  last_won_date: string | null;
}

export interface AccountHealthScore {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'fair' | 'at_risk' | 'inactive';
  factors: {
    recency: number;
    engagement: number;
    revenue: number;
    winRate: number;
  };
}

export type LifecycleStage = 'lead' | 'prospect' | 'active_client' | 'repeat_client' | 'churned';

/**
 * Calculate health score from 0-100 based on:
 * - Recency of last activity (40%)
 * - Engagement level: number of opportunities (20%)
 * - Revenue history (20%)
 * - Win rate (20%)
 */
export function calculateAccountHealth(input: AccountHealthInput): AccountHealthScore {
  const recency = calculateRecencyScore(input.last_activity_at);
  const engagement = calculateEngagementScore(
    input.total_opportunities,
    input.active_opportunities,
  );
  const revenue = calculateRevenueScore(input.total_revenue);
  const winRate = calculateWinRateScore(input.won_opportunities, input.total_opportunities);

  const score = Math.round(recency * 0.4 + engagement * 0.2 + revenue * 0.2 + winRate * 0.2);

  return {
    score,
    grade: scoreToGrade(score),
    factors: { recency, engagement, revenue, winRate },
  };
}

function calculateRecencyScore(lastActivityAt: string | null): number {
  if (!lastActivityAt) return 0;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince <= 7) return 100;
  if (daysSince <= 14) return 85;
  if (daysSince <= 30) return 70;
  if (daysSince <= 60) return 50;
  if (daysSince <= 90) return 30;
  return 10;
}

function calculateEngagementScore(total: number, active: number): number {
  if (total === 0) return 0;
  const baseScore = Math.min(total * 15, 60);
  const activeBonus = active > 0 ? 40 : 0;
  return Math.min(baseScore + activeBonus, 100);
}

function calculateRevenueScore(totalRevenue: number): number {
  if (totalRevenue <= 0) return 0;
  if (totalRevenue >= 1_000_000) return 100;
  if (totalRevenue >= 500_000) return 85;
  if (totalRevenue >= 100_000) return 70;
  if (totalRevenue >= 50_000) return 55;
  if (totalRevenue >= 10_000) return 40;
  return 25;
}

function calculateWinRateScore(won: number, total: number): number {
  if (total === 0) return 0;
  const rate = won / total;
  return Math.round(rate * 100);
}

function scoreToGrade(score: number): AccountHealthScore['grade'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'at_risk';
  return 'inactive';
}

/**
 * Determine lifecycle stage based on account activity.
 */
export function determineLifecycleStage(input: {
  won_opportunities: number;
  active_opportunities: number;
  last_activity_at: string | null;
  total_revenue: number;
}): LifecycleStage {
  const daysSinceActivity = input.last_activity_at
    ? Math.floor((Date.now() - new Date(input.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // Churned: no activity in 180+ days and no active opportunities
  if (daysSinceActivity > 180 && input.active_opportunities === 0 && input.won_opportunities > 0) {
    return 'churned';
  }

  // Repeat client: 2+ won opportunities
  if (input.won_opportunities >= 2) return 'repeat_client';

  // Active client: 1 won opportunity
  if (input.won_opportunities >= 1) return 'active_client';

  // Prospect: has active opportunities but no wins yet
  if (input.active_opportunities > 0) return 'prospect';

  return 'lead';
}
