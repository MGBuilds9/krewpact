import { describe, expect, it } from 'vitest';

import type { DivisionOpportunity } from '@/lib/crm/construction-intelligence';
import {
  calculateDivisionComparison,
  calculateSeasonalAnalysis,
} from '@/lib/crm/construction-intelligence';

const opps: DivisionOpportunity[] = [
  {
    id: '1',
    division_id: 'contracting',
    stage: 'contracted',
    estimated_revenue: 200000,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: '2',
    division_id: 'contracting',
    stage: 'closed_lost',
    estimated_revenue: 50000,
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: '3',
    division_id: 'homes',
    stage: 'estimating',
    estimated_revenue: 500000,
    created_at: '2026-04-05T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
  {
    id: '4',
    division_id: 'homes',
    stage: 'contracted',
    estimated_revenue: 750000,
    created_at: '2026-07-20T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: '5',
    division_id: null,
    stage: 'intake',
    estimated_revenue: 10000,
    created_at: '2025-10-15T12:00:00Z',
    updated_at: '2025-10-20T12:00:00Z',
  },
];

describe('calculateDivisionComparison', () => {
  it('returns empty array for empty input', () => {
    expect(calculateDivisionComparison([])).toEqual([]);
  });

  it('groups opportunities by division_id', () => {
    const result = calculateDivisionComparison(opps);
    const divisionIds = result.map((d) => d.division_id).sort();
    expect(divisionIds).toEqual(['contracting', 'homes', 'unassigned']);
  });

  it('calculates win rate as won / (won + lost) * 100 rounded', () => {
    const result = calculateDivisionComparison(opps);
    const contracting = result.find((d) => d.division_id === 'contracting')!;
    // 1 won, 1 lost => 50%
    expect(contracting.win_rate).toBe(50);
  });

  it('handles null division_id as unassigned', () => {
    const result = calculateDivisionComparison(opps);
    const unassigned = result.find((d) => d.division_id === 'unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned!.total_opportunities).toBe(1);
  });

  it('sorts by won_revenue descending', () => {
    const result = calculateDivisionComparison(opps);
    // homes: 750000 won, contracting: 200000 won, unassigned: 0 won
    expect(result[0].division_id).toBe('homes');
    expect(result[1].division_id).toBe('contracting');
    expect(result[2].division_id).toBe('unassigned');
  });

  it('calculates avg_deal_size as total_pipeline_value / total_opportunities rounded', () => {
    const result = calculateDivisionComparison(opps);
    const contracting = result.find((d) => d.division_id === 'contracting')!;
    // total_pipeline_value = 200000 + 50000 = 250000, 2 opps => 125000
    expect(contracting.avg_deal_size).toBe(125000);

    const homes = result.find((d) => d.division_id === 'homes')!;
    // total_pipeline_value = 500000 + 750000 = 1250000, 2 opps => 625000
    expect(homes.avg_deal_size).toBe(625000);
  });
});

describe('calculateSeasonalAnalysis', () => {
  it('returns empty array for empty input', () => {
    expect(calculateSeasonalAnalysis([])).toEqual([]);
  });

  it('groups opportunities by quarter correctly', () => {
    const result = calculateSeasonalAnalysis(opps);
    const quarters = result.map((q) => q.quarter);
    // 2025-Q4 (Oct), 2026-Q1 (Jan, Feb), 2026-Q2 (Apr), 2026-Q3 (Jul)
    expect(quarters).toEqual(['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3']);
  });

  it('counts won, lost, and created per quarter', () => {
    const result = calculateSeasonalAnalysis(opps);
    const q1 = result.find((q) => q.quarter === '2026-Q1')!;
    // opp 1 (contracted) + opp 2 (closed_lost) both created in Q1
    expect(q1.created).toBe(2);
    expect(q1.won).toBe(1);
    expect(q1.lost).toBe(1);
  });

  it('handles multiple years', () => {
    const result = calculateSeasonalAnalysis(opps);
    const years = new Set(result.map((q) => q.quarter.slice(0, 4)));
    expect(years.size).toBe(2);
    expect(years.has('2025')).toBe(true);
    expect(years.has('2026')).toBe(true);
  });

  it('sums revenue per quarter from estimated_revenue', () => {
    const result = calculateSeasonalAnalysis(opps);
    const q1 = result.find((q) => q.quarter === '2026-Q1')!;
    // 200000 + 50000
    expect(q1.revenue).toBe(250000);

    const q3 = result.find((q) => q.quarter === '2026-Q3')!;
    expect(q3.revenue).toBe(750000);
  });

  it('sorts chronologically by quarter', () => {
    // Feed in reverse order to confirm sorting
    const reversed = [...opps].reverse();
    const result = calculateSeasonalAnalysis(reversed);
    const quarters = result.map((q) => q.quarter);
    expect(quarters).toEqual(['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3']);
  });
});
