import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('createCronLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs success to cron_runs table', async () => {
    const { createCronLogger } = await import('@/lib/api/cron-logger');
    const cronLog = createCronLogger('test-cron');
    await cronLog.success({ processed: 5 });

    expect(mockFrom).toHaveBeenCalledWith('cron_runs');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cron_name: 'test-cron',
        status: 'success',
        result: { processed: 5 },
        error: null,
      }),
    );
  });

  it('logs failure with error message', async () => {
    const { createCronLogger } = await import('@/lib/api/cron-logger');
    const cronLog = createCronLogger('failing-cron');
    await cronLog.failure(new Error('something broke'));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cron_name: 'failing-cron',
        status: 'failure',
        error: 'something broke',
      }),
    );
  });

  it('includes duration_ms in the log', async () => {
    const { createCronLogger } = await import('@/lib/api/cron-logger');
    const cronLog = createCronLogger('timed-cron');
    await cronLog.success();

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.duration_ms).toBeGreaterThanOrEqual(0);
    expect(insertArg.started_at).toBeDefined();
    expect(insertArg.finished_at).toBeDefined();
  });

  it('does not throw if insert fails', async () => {
    mockInsert.mockRejectedValueOnce(new Error('DB down'));
    const { createCronLogger } = await import('@/lib/api/cron-logger');
    const cronLog = createCronLogger('robust-cron');
    // Should not throw
    await expect(cronLog.success()).resolves.toBeUndefined();
  });
});
