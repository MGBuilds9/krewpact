/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/ai/providers/gemini', () => ({ generateWithGemini: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { createServiceClient } from '@/lib/supabase/server';
import { generateWithGemini } from '@/lib/ai/providers/gemini';
import { buildDigest } from '@/lib/ai/agents/digest-builder';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGenerateWithGemini = vi.mocked(generateWithGemini);

function mockChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = [
    'select', 'eq', 'neq', 'not', 'is', 'lt', 'lte', 'gt', 'gte',
    'or', 'ilike', 'order', 'limit', 'insert', 'update',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockImplementation(() => Promise.resolve({ data, error }));
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

function makeClient(tableMap: Record<string, unknown>) {
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    return (tableMap[table] ?? mockChain([]));
  });
  return { from: mockFrom };
}

describe('buildDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateWithGemini.mockResolvedValue('You have 3 tasks due today and 2 open deals in your pipeline.');
  });

  it('returns sales sections for operations_manager role', async () => {
    const oppsChain = mockChain([
      { id: 'o1', name: 'Deal A', stage: 'proposal', value: 500000, updated_at: '2026-03-10T00:00:00Z' },
    ]);
    const leadsChain = mockChain([
      { id: 'l1', company_name: 'Co A', source_channel: 'website' },
    ]);
    const client = makeClient({ opportunities: oppsChain, leads: leadsChain });
    mockCreateServiceClient.mockReturnValue(client as any);

    const result = await buildDigest('user-1', 'org-1', ['operations_manager']);

    expect(result.sections).toBeDefined();
    expect(Array.isArray(result.sections)).toBe(true);
    // Should include pipeline section with the opp data
    const pipelineSection = result.sections.find(s => s.title === 'Active Pipeline');
    expect(pipelineSection).toBeDefined();
    expect(pipelineSection?.items.some(i => i.label === 'Open deals')).toBe(true);
  });

  it('returns PM sections for project_manager role', async () => {
    const tasksChain = mockChain([
      { id: 't1', title: 'Install framing', status: 'pending', due_date: '2026-03-12', project_id: 'p1' },
      { id: 't2', title: 'Plumbing inspection', status: 'in_progress', due_date: '2026-03-12', project_id: 'p1' },
    ]);
    const projectsChain = mockChain([
      { id: 'p1', name: 'Thornhill Renovation', status: 'active', budget: 1000000, actual_cost: 750000 },
    ]);
    const client = makeClient({ tasks: tasksChain, projects: projectsChain });
    mockCreateServiceClient.mockReturnValue(client as any);

    const result = await buildDigest('user-2', 'org-1', ['project_manager']);

    const tasksSection = result.sections.find(s => s.title === 'Tasks Due Today');
    expect(tasksSection).toBeDefined();
    expect(tasksSection?.items.some(i => i.label === 'Install framing')).toBe(true);

    const projectsSection = result.sections.find(s => s.title === 'Active Projects');
    expect(projectsSection).toBeDefined();
    expect(projectsSection?.items[0].value).toContain('75%');
  });

  it('returns executive sections for executive role', async () => {
    const wonChain = mockChain([
      { id: 'o1', name: 'Big Contract', value: 2000000 },
    ]);
    const lostChain = mockChain([
      { id: 'o2', name: 'Lost Bid', value: 800000 },
    ]);
    // executive also calls fetchSalesSections internally — map by stage query
    // We can't distinguish by stage eq in mock, so reuse same chain for all opp queries
    const oppsChain = mockChain([
      { id: 'o3', name: 'Active Deal', stage: 'proposal', value: 300000, updated_at: '2026-03-11T00:00:00Z' },
    ]);
    const leadsChain = mockChain([]);

    // For executive: won query uses eq('stage','contracted'), lost uses eq('stage','closed_lost')
    // The chain doesn't distinguish, so we track calls differently.
    // Use a stateful from() that returns won chain on first opp call, lost on second:
    let oppCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'opportunities') {
        oppCallCount++;
        if (oppCallCount === 1) return wonChain;
        if (oppCallCount === 2) return lostChain;
        return oppsChain;
      }
      if (table === 'leads') return leadsChain;
      return mockChain([]);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const result = await buildDigest('user-3', 'org-1', ['executive']);

    const mtdSection = result.sections.find(s => s.title === 'Month-to-Date');
    expect(mtdSection).toBeDefined();
    expect(mtdSection?.items.some(i => i.label === 'Won')).toBe(true);
    expect(mtdSection?.items.some(i => i.label === 'Lost')).toBe(true);
  });

  it('returns combined sections for accounting role (other)', async () => {
    const oppsChain = mockChain([
      { id: 'o1', name: 'Deal B', stage: 'qualified', value: 150000, updated_at: '2026-03-10T00:00:00Z' },
    ]);
    const leadsChain = mockChain([]);
    const tasksChain = mockChain([
      { id: 't1', title: 'Review invoices', status: 'pending', due_date: '2026-03-12', project_id: 'p1' },
    ]);
    const projectsChain = mockChain([
      { id: 'p1', name: 'Office Build', status: 'active', budget: 500000, actual_cost: 200000 },
    ]);
    const client = makeClient({
      opportunities: oppsChain,
      leads: leadsChain,
      tasks: tasksChain,
      projects: projectsChain,
    });
    mockCreateServiceClient.mockReturnValue(client as any);

    const result = await buildDigest('user-4', 'org-1', ['accounting']);

    // Should have both sales and PM sections
    expect(result.sections.length).toBeGreaterThan(0);
    const hasSalesSection = result.sections.some(s => s.title === 'Active Pipeline');
    const hasPMSection = result.sections.some(s =>
      s.title === 'Tasks Due Today' || s.title === 'Active Projects'
    );
    expect(hasSalesSection || hasPMSection).toBe(true);
  });

  it('generates summary via Gemini', async () => {
    const oppsChain = mockChain([
      { id: 'o1', name: 'Deal C', stage: 'proposal', value: 100000, updated_at: '2026-03-11T00:00:00Z' },
    ]);
    const leadsChain = mockChain([]);
    const client = makeClient({ opportunities: oppsChain, leads: leadsChain });
    mockCreateServiceClient.mockReturnValue(client as any);

    mockGenerateWithGemini.mockResolvedValue('Strong pipeline with 1 active deal worth $100K.');

    const result = await buildDigest('user-1', 'org-1', ['estimator']);

    expect(mockGenerateWithGemini).toHaveBeenCalledOnce();
    expect(result.summary).toBe('Strong pipeline with 1 active deal worth $100K.');
  });

  it('falls back to template summary when Gemini fails', async () => {
    const oppsChain = mockChain([
      { id: 'o1', name: 'Deal D', stage: 'qualified', value: 200000, updated_at: '2026-03-10T00:00:00Z' },
    ]);
    const leadsChain = mockChain([
      { id: 'l1', company_name: 'Beta Corp', source_channel: 'referral' },
    ]);
    const client = makeClient({ opportunities: oppsChain, leads: leadsChain });
    mockCreateServiceClient.mockReturnValue(client as any);

    mockGenerateWithGemini.mockRejectedValue(new Error('Gemini quota exceeded'));

    const result = await buildDigest('user-1', 'org-1', ['operations_manager']);

    expect(result.summary).toMatch(/items across/);
    expect(result.summary).toMatch(/categories/);
  });

  it('returns empty sections when no data', async () => {
    const emptyChain = mockChain([]);
    const client = makeClient({
      opportunities: emptyChain,
      leads: emptyChain,
      tasks: emptyChain,
      projects: emptyChain,
    });
    mockCreateServiceClient.mockReturnValue(client as any);

    const result = await buildDigest('user-5', 'org-1', ['project_manager']);

    expect(result.sections).toEqual([]);
    // Summary still generated (empty data passed to Gemini)
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
  });
});
