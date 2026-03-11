/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, calculateHealthScore } from '@/app/api/dashboard/pm/route';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeRequest() {
  return new NextRequest(new URL('http://localhost/api/dashboard/pm'));
}

function mockAuthWithRoles(userId: string, roles: string[]) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {
      krewpact_roles: roles,
      krewpact_user_id: userId,
    },
  } as any as Awaited<ReturnType<typeof auth>>);
}

describe('GET /api/dashboard/pm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks required role', async () => {
    mockAuthWithRoles('user_field', ['field_supervisor']);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 403 for accounting role', async () => {
    mockAuthWithRoles('user_acct', ['accounting']);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('allows project_manager role', async () => {
    mockAuthWithRoles('user_pm', ['project_manager']);

    // Mock empty memberships
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'project_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toEqual([]);
    expect(body.upcomingMilestones).toEqual([]);
    expect(body.overdueTasks).toEqual([]);
  });

  it('allows operations_manager role', async () => {
    mockAuthWithRoles('user_ops', ['operations_manager']);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'project_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('allows executive role', async () => {
    mockAuthWithRoles('user_exec', ['executive']);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'project_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('returns 500 when project_members query fails', async () => {
    mockAuthWithRoles('user_pm', ['project_manager']);

    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              data: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      }),
    }));

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('project assignments');
  });

  it('returns full dashboard data with project health', async () => {
    mockAuthWithRoles('user_pm', ['project_manager']);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const yesterdayISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const memberships = [{ project_id: 'proj-1' }, { project_id: 'proj-2' }];
    const projects = [
      {
        id: 'proj-1',
        project_name: 'Office Renovation',
        project_number: 'PRJ-001',
        status: 'active',
        start_date: '2026-01-01',
        target_completion_date: '2026-06-01',
      },
      {
        id: 'proj-2',
        project_name: 'Condo Build',
        project_number: 'PRJ-002',
        status: 'active',
        start_date: '2026-02-01',
        target_completion_date: '2026-12-01',
      },
    ];
    const milestones = [
      {
        id: 'ms-1',
        project_id: 'proj-1',
        milestone_name: 'Foundation',
        planned_date: threeDaysAgo,
        status: 'completed',
      },
      {
        id: 'ms-2',
        project_id: 'proj-1',
        milestone_name: 'Framing',
        planned_date: twoDaysFromNow,
        status: 'in_progress',
      },
      {
        id: 'ms-3',
        project_id: 'proj-2',
        milestone_name: 'Permits',
        planned_date: twoDaysFromNow,
        status: 'pending',
      },
    ];
    const tasks = [
      {
        id: 'task-1',
        project_id: 'proj-1',
        title: 'Pour concrete',
        status: 'done',
        priority: 'high',
        due_at: yesterdayISO,
      },
      {
        id: 'task-2',
        project_id: 'proj-1',
        title: 'Install rebar',
        status: 'in_progress',
        priority: 'medium',
        due_at: yesterdayISO,
      },
      {
        id: 'task-3',
        project_id: 'proj-2',
        title: 'File permits',
        status: 'todo',
        priority: 'high',
        due_at: yesterdayISO,
      },
    ];
    const logs = [
      { project_id: 'proj-1', log_date: todayStr },
      { project_id: 'proj-2', log_date: threeDaysAgo },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'project_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  data: memberships,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              data: projects,
              error: null,
            }),
          }),
        };
      }
      if (table === 'milestones') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              data: milestones,
              error: null,
            }),
          }),
        };
      }
      if (table === 'tasks') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              data: tasks,
              error: null,
            }),
          }),
        };
      }
      if (table === 'project_daily_logs') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                data: logs,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();

    // Should have 2 projects
    expect(body.projects).toHaveLength(2);

    // Project 1: 1/2 milestones completed, 1 overdue task, logged today
    const proj1 = body.projects.find((p: { id: string }) => p.id === 'proj-1');
    expect(proj1).toBeDefined();
    expect(proj1.milestoneTotal).toBe(2);
    expect(proj1.milestoneCompleted).toBe(1);
    expect(proj1.overdueTaskCount).toBe(1); // task-2 is overdue (in_progress + past due)
    expect(proj1.lastDailyLogDate).toBe(todayStr);
    expect(proj1.healthStatus).toBeDefined();
    expect(['green', 'yellow', 'red']).toContain(proj1.healthStatus);

    // Project 2: 0/1 milestones completed, 1 overdue task, logged 3 days ago
    const proj2 = body.projects.find((p: { id: string }) => p.id === 'proj-2');
    expect(proj2).toBeDefined();
    expect(proj2.milestoneTotal).toBe(1);
    expect(proj2.milestoneCompleted).toBe(0);
    expect(proj2.overdueTaskCount).toBe(1);

    // Upcoming milestones should include ms-2 and ms-3 (within 7 days, not completed)
    expect(body.upcomingMilestones.length).toBeGreaterThanOrEqual(2);

    // Overdue tasks should include task-2 and task-3 (not done/completed, past due)
    expect(body.overdueTasks).toHaveLength(2);
    const overdueIds = body.overdueTasks.map((t: { id: string }) => t.id);
    expect(overdueIds).toContain('task-2');
    expect(overdueIds).toContain('task-3');
  });

  it('returns 500 when parallel queries fail', async () => {
    mockAuthWithRoles('user_pm', ['project_manager']);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'project_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  data: [{ project_id: 'proj-1' }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // All other queries fail
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: null,
              error: { message: 'DB failure' },
            }),
            data: null,
            error: { message: 'DB failure' },
          }),
        }),
      };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('PM dashboard');
  });

  it('returns empty arrays when user has no project memberships', async () => {
    mockAuthWithRoles('user_pm', ['project_manager']);

    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    }));

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.projects).toEqual([]);
    expect(body.upcomingMilestones).toEqual([]);
    expect(body.overdueTasks).toEqual([]);
  });
});

describe('calculateHealthScore', () => {
  it('returns green (100) when all milestones complete, no overdue, logged today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = calculateHealthScore(5, 5, 0, today);
    expect(result.score).toBeGreaterThan(80);
    expect(result.status).toBe('green');
  });

  it('returns red when no milestones complete and many overdue tasks', () => {
    const result = calculateHealthScore(10, 0, 5, null);
    expect(result.score).toBeLessThan(50);
    expect(result.status).toBe('red');
  });

  it('returns yellow for moderate completion', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = calculateHealthScore(4, 2, 1, threeDaysAgo);
    // 50% milestones * 0.5 = 25, 80% overdue * 0.3 = 24, ~57% log * 0.2 = ~11.4 => ~60
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(80);
    expect(result.status).toBe('yellow');
  });

  it('handles zero milestones gracefully (treats as 100%)', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = calculateHealthScore(0, 0, 0, today);
    expect(result.score).toBeGreaterThan(80);
    expect(result.status).toBe('green');
  });

  it('handles null lastDailyLogDate (no logs ever)', () => {
    const result = calculateHealthScore(2, 2, 0, null);
    // 100 * 0.5 + 100 * 0.3 + 0 * 0.2 = 80
    expect(result.score).toBe(80);
    // 80 is not > 80, so yellow
    expect(result.status).toBe('yellow');
  });

  it('clamps score to 0-100 range', () => {
    const result = calculateHealthScore(10, 0, 10, null);
    // 0 * 0.5 + 0 * 0.3 + 0 * 0.2 = 0
    expect(result.score).toBe(0);
    expect(result.status).toBe('red');
  });

  it('penalizes overdue tasks significantly', () => {
    const today = new Date().toISOString().slice(0, 10);
    const noOverdue = calculateHealthScore(4, 4, 0, today);
    const withOverdue = calculateHealthScore(4, 4, 3, today);
    expect(withOverdue.score).toBeLessThan(noOverdue.score);
  });

  it('penalizes stale daily logs', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fresh = calculateHealthScore(4, 4, 0, today);
    const stale = calculateHealthScore(4, 4, 0, sevenDaysAgo);
    expect(stale.score).toBeLessThan(fresh.score);
  });
});
