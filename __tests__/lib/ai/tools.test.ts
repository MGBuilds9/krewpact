import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { executeToolCall, queryTools } from '@/lib/ai/tools';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);

const ORG_ID = '00000000-0000-4000-a000-000000000000';

function mockChainClient(data: any[], error: any = null, count?: number) {
  const chain: any = {};
  const methods = ['select', 'eq', 'not', 'in', 'gte', 'lte', 'lt', 'gt', 'order', 'limit'];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: any) => resolve({ data, error, count: count ?? data?.length ?? 0 });
  return { from: vi.fn().mockReturnValue(chain) };
}

describe('queryTools', () => {
  it('has 4 tool definitions', () => {
    expect(queryTools).toHaveLength(4);
    const names = queryTools.map((t) => t.name);
    expect(names).toContain('search_opportunities');
    expect(names).toContain('search_leads');
    expect(names).toContain('search_projects');
    expect(names).toContain('get_metrics');
  });
});

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('search_opportunities returns filtered results with summary', async () => {
    const opportunities = [
      {
        id: 'opp-1',
        name: 'Big Reno',
        stage: 'proposal',
        value: 80000,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'opp-2',
        name: 'Office Fit-Out',
        stage: 'proposal',
        value: 40000,
        updated_at: new Date().toISOString(),
      },
    ];
    mockCreateServiceClient.mockReturnValue(mockChainClient(opportunities) as any);

    const result = await executeToolCall('search_opportunities', {}, ORG_ID);
    expect(result.data).toEqual(opportunities);
    expect(result.summary).toContain('Found 2 opportunit');
    expect(result.summary).toContain('$120,000');
  });

  it('search_opportunities handles empty results', async () => {
    mockCreateServiceClient.mockReturnValue(mockChainClient([]) as any);

    const result = await executeToolCall('search_opportunities', {}, ORG_ID);
    expect(result.data).toEqual([]);
    expect(result.summary).toBe('No opportunities matched the filters.');
  });

  it('search_leads filters by status', async () => {
    const leads = [
      {
        id: 'lead-1',
        first_name: 'Alice',
        last_name: 'Smith',
        company_name: 'Acme',
        status: 'qualified',
        lead_score: 85,
        source: 'website',
      },
    ];
    mockCreateServiceClient.mockReturnValue(mockChainClient(leads) as any);

    const result = await executeToolCall('search_leads', { status: 'qualified' }, ORG_ID);
    expect(result.data).toEqual(leads);
    expect(result.summary).toContain('Found 1 lead');
    expect(result.summary).toContain('Alice Smith');
  });

  it('search_projects filters over_budget', async () => {
    const projects = [
      {
        id: 'proj-1',
        project_name: 'Tower',
        status: 'active',
        budget: 100000,
        actual_cost: 130000,
      },
      {
        id: 'proj-2',
        project_name: 'Annex',
        status: 'active',
        budget: 200000,
        actual_cost: 180000,
      },
    ];
    mockCreateServiceClient.mockReturnValue(mockChainClient(projects) as any);

    const result = await executeToolCall('search_projects', { over_budget: true }, ORG_ID);
    const filtered = result.data as any[];
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('proj-1');
    expect(result.summary).toContain('Found 1 project');
  });

  it('get_metrics pipeline_value sums values', async () => {
    const opportunities = [{ value: 50000 }, { value: 75000 }, { value: 25000 }];
    mockCreateServiceClient.mockReturnValue(mockChainClient(opportunities) as any);

    const result = await executeToolCall('get_metrics', { metric: 'pipeline_value' }, ORG_ID);
    expect(result.data).toEqual({ pipeline_value: 150000 });
    expect(result.summary).toContain('$150,000');
    expect(result.summary).toContain('3 open deals');
  });

  it('get_metrics win_rate calculates percentage', async () => {
    const closedDeals = [
      { stage: 'contracted' },
      { stage: 'contracted' },
      { stage: 'contracted' },
      { stage: 'closed_lost' },
    ];
    mockCreateServiceClient.mockReturnValue(mockChainClient(closedDeals) as any);

    const result = await executeToolCall('get_metrics', { metric: 'win_rate' }, ORG_ID);
    expect(result.data).toEqual({ win_rate: 75, won: 3, total: 4 });
    expect(result.summary).toContain('75%');
    expect(result.summary).toContain('3 won out of 4');
  });

  it('returns unknown tool message for invalid tool name', async () => {
    mockCreateServiceClient.mockReturnValue(mockChainClient([]) as any);

    const result = await executeToolCall('nonexistent_tool', {}, ORG_ID);
    expect(result.data).toBeNull();
    expect(result.summary).toContain('Unknown tool: nonexistent_tool');
  });
});
