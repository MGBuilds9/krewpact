import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processSequences } from '@/lib/crm/sequence-processor';
import { mockSupabaseClient } from '@/__tests__/helpers';

describe('processSequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zero counts when no active enrollments exist', async () => {
    const client = mockSupabaseClient({
      tables: {
        sequence_enrollments: { data: [], error: null },
      },
    });

    const result = await processSequences(client);
    expect(result).toEqual({ processed: 0, completed: 0, errors: [], deadLettered: 0 });
  });

  it('returns error when enrollment fetch fails', async () => {
    const client = mockSupabaseClient({
      tables: {
        sequence_enrollments: { data: null, error: { message: 'DB error' } },
      },
    });

    const result = await processSequences(client);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch enrollments');
  });

  it('marks enrollment completed when no step found for current_step', async () => {
    // We need a more complex mock for this since processSequences does multiple queries.
    // The mock supabase client resolves per-table, so sequence_enrollments returns enrollments,
    // then sequence_steps returns no data (step not found).

    const _mockChain = () => {
      const chain: Record<string, unknown> = {};
      const methods = [
        'select',
        'insert',
        'update',
        'delete',
        'eq',
        'lte',
        'order',
        'limit',
        'range',
        'single',
        'maybeSingle',
      ];
      for (const m of methods) {
        if (m === 'single') {
          chain[m] = vi
            .fn()
            .mockImplementation(() =>
              Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
            );
        } else {
          chain[m] = vi.fn().mockImplementation(() => chain);
        }
      }
      // Override 'then' to resolve based on call context
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return chain;
    };

    const enrollmentData = [
      {
        id: 'enroll-1',
        sequence_id: 'seq-1',
        lead_id: 'lead-1',
        contact_id: null,
        current_step: 1,
        status: 'active',
        next_step_at: '2026-02-24T11:00:00Z',
      },
    ];

    // Build a custom mock that tracks which table we're querying
    const fromCalls: string[] = [];
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCalls.push(table);
        const _chain: Record<string, unknown> = {};
        const createChain = (): Record<string, unknown> => {
          const c: Record<string, unknown> = {};
          const methods = [
            'select',
            'insert',
            'update',
            'delete',
            'eq',
            'lte',
            'order',
            'limit',
            'range',
            'neq',
            'gt',
            'gte',
            'lt',
            'ilike',
            'is',
            'or',
            'not',
            'contains',
            'containedBy',
            'filter',
            'match',
            'in',
          ];
          for (const m of methods) {
            c[m] = vi.fn().mockImplementation(() => createChain());
          }
          c.single = vi.fn().mockImplementation(() => {
            if (table === 'sequence_steps') {
              return Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'not found' },
              });
            }
            return Promise.resolve({ data: null, error: null });
          });
          c.then = (resolve: (v: unknown) => void) => {
            if (table === 'sequence_enrollments') {
              return resolve({ data: enrollmentData, error: null });
            }
            return resolve({ data: [], error: null });
          };
          return c;
        };
        return createChain();
      }),
    };

    const result = await processSequences(mockClient as never);
    expect(result.processed).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('processes email step and creates outreach event', async () => {
    const enrollmentData = [
      {
        id: 'enroll-1',
        sequence_id: 'seq-1',
        lead_id: 'lead-1',
        contact_id: 'contact-1',
        current_step: 1,
        status: 'active',
        next_step_at: '2026-02-24T11:00:00Z',
      },
    ];

    const stepData = {
      id: 'step-1',
      sequence_id: 'seq-1',
      step_number: 1,
      action_type: 'email',
      action_config: { subject: 'Follow up', body: 'Hello!' },
      delay_days: 0,
      delay_hours: 0,
    };

    let singleCallIndex = 0;
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        const createChain = (): Record<string, unknown> => {
          const c: Record<string, unknown> = {};
          const methods = [
            'select',
            'insert',
            'update',
            'delete',
            'eq',
            'lte',
            'order',
            'limit',
            'range',
            'neq',
            'gt',
            'gte',
            'lt',
            'ilike',
            'is',
            'or',
            'not',
            'contains',
            'containedBy',
            'filter',
            'match',
            'in',
          ];
          for (const m of methods) {
            c[m] = vi.fn().mockImplementation(() => createChain());
          }
          c.single = vi.fn().mockImplementation(() => {
            singleCallIndex++;
            if (table === 'sequence_steps' && singleCallIndex === 1) {
              // First call: get current step
              return Promise.resolve({ data: stepData, error: null });
            }
            if (table === 'sequence_steps' && singleCallIndex === 2) {
              // Second call: check next step — doesn't exist
              return Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'not found' },
              });
            }
            return Promise.resolve({ data: null, error: null });
          });
          c.then = (resolve: (v: unknown) => void) => {
            if (table === 'sequence_enrollments') {
              return resolve({ data: enrollmentData, error: null });
            }
            return resolve({ data: [], error: null });
          };
          return c;
        };
        return createChain();
      }),
    };

    const result = await processSequences(mockClient as never);
    expect(result.processed).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.errors).toHaveLength(0);
    // Verify outreach_events insert was called
    expect(mockClient.from).toHaveBeenCalledWith('outreach_events');
  });

  it('processes task step and creates activity', async () => {
    const enrollmentData = [
      {
        id: 'enroll-2',
        sequence_id: 'seq-2',
        lead_id: 'lead-2',
        contact_id: null,
        current_step: 1,
        status: 'active',
        next_step_at: '2026-02-24T11:00:00Z',
      },
    ];

    const stepData = {
      id: 'step-2',
      sequence_id: 'seq-2',
      step_number: 1,
      action_type: 'task',
      action_config: { title: 'Call prospect', description: 'Follow up call' },
      delay_days: 0,
      delay_hours: 0,
    };

    let singleCallIndex = 0;
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        const createChain = (): Record<string, unknown> => {
          const c: Record<string, unknown> = {};
          const methods = [
            'select',
            'insert',
            'update',
            'delete',
            'eq',
            'lte',
            'order',
            'limit',
            'range',
            'neq',
            'gt',
            'gte',
            'lt',
            'ilike',
            'is',
            'or',
            'not',
            'contains',
            'containedBy',
            'filter',
            'match',
            'in',
          ];
          for (const m of methods) {
            c[m] = vi.fn().mockImplementation(() => createChain());
          }
          c.single = vi.fn().mockImplementation(() => {
            singleCallIndex++;
            if (table === 'sequence_steps' && singleCallIndex === 1) {
              return Promise.resolve({ data: stepData, error: null });
            }
            if (table === 'sequence_steps' && singleCallIndex === 2) {
              return Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'not found' },
              });
            }
            return Promise.resolve({ data: null, error: null });
          });
          c.then = (resolve: (v: unknown) => void) => {
            if (table === 'sequence_enrollments') {
              return resolve({ data: enrollmentData, error: null });
            }
            return resolve({ data: [], error: null });
          };
          return c;
        };
        return createChain();
      }),
    };

    const result = await processSequences(mockClient as never);
    expect(result.processed).toBe(1);
    expect(result.completed).toBe(1);
    expect(mockClient.from).toHaveBeenCalledWith('activities');
  });

  it('advances to next step when more steps exist', async () => {
    const enrollmentData = [
      {
        id: 'enroll-3',
        sequence_id: 'seq-3',
        lead_id: 'lead-3',
        contact_id: null,
        current_step: 1,
        status: 'active',
        next_step_at: '2026-02-24T11:00:00Z',
      },
    ];

    const currentStep = {
      id: 'step-3a',
      sequence_id: 'seq-3',
      step_number: 1,
      action_type: 'wait',
      action_config: {},
      delay_days: 0,
      delay_hours: 0,
    };

    const nextStep = {
      delay_days: 2,
      delay_hours: 4,
    };

    let singleCallIndex = 0;
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        const createChain = (): Record<string, unknown> => {
          const c: Record<string, unknown> = {};
          const methods = [
            'select',
            'insert',
            'update',
            'delete',
            'eq',
            'lte',
            'order',
            'limit',
            'range',
            'neq',
            'gt',
            'gte',
            'lt',
            'ilike',
            'is',
            'or',
            'not',
            'contains',
            'containedBy',
            'filter',
            'match',
            'in',
          ];
          for (const m of methods) {
            c[m] = vi.fn().mockImplementation(() => createChain());
          }
          c.single = vi.fn().mockImplementation(() => {
            singleCallIndex++;
            if (table === 'sequence_steps' && singleCallIndex === 1) {
              return Promise.resolve({ data: currentStep, error: null });
            }
            if (table === 'sequence_steps' && singleCallIndex === 2) {
              return Promise.resolve({ data: nextStep, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          });
          c.then = (resolve: (v: unknown) => void) => {
            if (table === 'sequence_enrollments') {
              return resolve({ data: enrollmentData, error: null });
            }
            return resolve({ data: [], error: null });
          };
          return c;
        };
        return createChain();
      }),
    };

    const result = await processSequences(mockClient as never);
    expect(result.processed).toBe(1);
    expect(result.completed).toBe(0); // Not completed — advanced to step 2
    expect(result.errors).toHaveLength(0);
    // Verify enrollment update was called
    expect(mockClient.from).toHaveBeenCalledWith('sequence_enrollments');
  });

  it('handles outreach creation error gracefully', async () => {
    const enrollmentData = [
      {
        id: 'enroll-err',
        sequence_id: 'seq-err',
        lead_id: 'lead-err',
        contact_id: null,
        current_step: 1,
        status: 'active',
        next_step_at: '2026-02-24T11:00:00Z',
      },
    ];

    const stepData = {
      id: 'step-err',
      sequence_id: 'seq-err',
      step_number: 1,
      action_type: 'email',
      action_config: { subject: 'Test' },
      delay_days: 0,
      delay_hours: 0,
    };

    let singleCallIndex = 0;
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        const createChain = (): Record<string, unknown> => {
          const c: Record<string, unknown> = {};
          const methods = [
            'select',
            'insert',
            'update',
            'delete',
            'eq',
            'lte',
            'order',
            'limit',
            'range',
            'neq',
            'gt',
            'gte',
            'lt',
            'ilike',
            'is',
            'or',
            'not',
            'contains',
            'containedBy',
            'filter',
            'match',
            'in',
          ];
          for (const m of methods) {
            c[m] = vi.fn().mockImplementation(() => createChain());
          }
          c.single = vi.fn().mockImplementation(() => {
            singleCallIndex++;
            if (table === 'sequence_steps' && singleCallIndex === 1) {
              return Promise.resolve({ data: stepData, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          });
          c.then = (resolve: (v: unknown) => void) => {
            if (table === 'sequence_enrollments') {
              return resolve({ data: enrollmentData, error: null });
            }
            if (table === 'outreach_events') {
              return resolve({ data: null, error: { message: 'Insert failed' } });
            }
            return resolve({ data: [], error: null });
          };
          return c;
        };
        return createChain();
      }),
    };

    const result = await processSequences(mockClient as never);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to create outreach event');
  });
});
