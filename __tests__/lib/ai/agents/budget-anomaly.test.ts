/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { detectBudgetAnomalies } from '@/lib/ai/agents/budget-anomaly';

const mockCreateServiceClient = vi.mocked(createServiceClient);

const ORG_ID = '00000000-0000-4000-a000-000000000000';

function mockProjectsClient(projects: any[], error: any = null) {
  const chain: any = {};
  const methods = ['select', 'eq', 'not', 'gt', 'order', 'limit'];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: any) => resolve({ data: projects, error });
  return { from: vi.fn().mockReturnValue(chain) };
}

const overBudgetProject = {
  id: 'proj-1',
  project_name: 'HQ Renovation',
  budget: 100000,
  actual_cost: 125000,
  status: 'active',
};
const withinBudget = {
  id: 'proj-2',
  project_name: 'Office Build',
  budget: 200000,
  actual_cost: 210000,
  status: 'active',
}; // 105% — within threshold
const wayOverBudget = {
  id: 'proj-3',
  project_name: 'Tower Build',
  budget: 500000,
  actual_cost: 800000,
  status: 'active',
}; // 160%

describe('detectBudgetAnomalies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no projects found', async () => {
    mockCreateServiceClient.mockReturnValue(mockProjectsClient([]) as any);

    const result = await detectBudgetAnomalies(ORG_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array on supabase error and logs warning', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockProjectsClient([], { message: 'connection timeout' }) as any,
    );

    const result = await detectBudgetAnomalies(ORG_ID);
    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Budget anomaly detection failed', {
      error: 'connection timeout',
    });
  });

  it('skips projects within budget (ratio <= 1.1)', async () => {
    mockCreateServiceClient.mockReturnValue(mockProjectsClient([withinBudget]) as any);

    const result = await detectBudgetAnomalies(ORG_ID);
    expect(result).toEqual([]);
  });

  it('flags projects over 110% budget', async () => {
    mockCreateServiceClient.mockReturnValue(mockProjectsClient([overBudgetProject]) as any);

    const result = await detectBudgetAnomalies(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe('proj-1');
    expect(result[0].insight.title).toMatch(/Budget overrun/);
  });

  it('calculates correct overPercent and overAmount', async () => {
    mockCreateServiceClient.mockReturnValue(mockProjectsClient([overBudgetProject]) as any);

    const result = await detectBudgetAnomalies(ORG_ID);
    expect(result).toHaveLength(1);
    // 125000 / 100000 = 1.25 → 25% over, $25000 over
    expect(result[0].insight.title).toBe('Budget overrun — 25% over budget');
    expect(result[0].insight.metadata).toMatchObject({
      budget: 100000,
      actual_cost: 125000,
      over_amount: 25000,
    });
  });

  it('confidence scales with budget overrun ratio', async () => {
    mockCreateServiceClient.mockReturnValueOnce(mockProjectsClient([overBudgetProject]) as any);
    const result1 = await detectBudgetAnomalies(ORG_ID);

    mockCreateServiceClient.mockReturnValueOnce(mockProjectsClient([wayOverBudget]) as any);
    const result2 = await detectBudgetAnomalies(ORG_ID);

    expect(result2[0].insight.confidence).toBeGreaterThan(result1[0].insight.confidence);
  });

  it('caps confidence at 0.95', async () => {
    // 800000 / 500000 = 1.6 → ratio - 1.1 = 0.5 → 0.75 + 0.5*0.5 = 1.0 → capped at 0.95
    mockCreateServiceClient.mockReturnValue(mockProjectsClient([wayOverBudget]) as any);

    const result = await detectBudgetAnomalies(ORG_ID);
    expect(result[0].insight.confidence).toBe(0.95);
  });
});
