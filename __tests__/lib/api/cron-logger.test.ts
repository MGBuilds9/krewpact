import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

const mockCaptureCheckIn = vi.fn().mockReturnValue('mock-check-in-id');

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: mockCaptureCheckIn,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('createCronLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default return value for each fresh test
    mockCaptureCheckIn.mockReturnValue('mock-check-in-id');
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

  describe('Sentry cron check-ins', () => {
    it('calls captureCheckIn with in_progress on creation', async () => {
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      createCronLogger('sentry-cron');

      expect(mockCaptureCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({ monitorSlug: 'sentry-cron', status: 'in_progress' }),
        undefined,
      );
    });

    it('calls captureCheckIn with ok status on success', async () => {
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      const cronLog = createCronLogger('sentry-ok-cron');
      await cronLog.success();

      const calls = mockCaptureCheckIn.mock.calls;
      // Second call is the completion
      expect(calls[1][0]).toMatchObject({
        monitorSlug: 'sentry-ok-cron',
        status: 'ok',
        checkInId: 'mock-check-in-id',
      });
    });

    it('calls captureCheckIn with error status on failure', async () => {
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      const cronLog = createCronLogger('sentry-fail-cron');
      await cronLog.failure(new Error('boom'));

      const calls = mockCaptureCheckIn.mock.calls;
      expect(calls[1][0]).toMatchObject({
        monitorSlug: 'sentry-fail-cron',
        status: 'error',
        checkInId: 'mock-check-in-id',
      });
    });

    it('passes crontab schedule to Sentry when provided', async () => {
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      createCronLogger('scheduled-cron', { type: 'crontab', value: '0 * * * *' });

      expect(mockCaptureCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({ monitorSlug: 'scheduled-cron', status: 'in_progress' }),
        { schedule: { type: 'crontab', value: '0 * * * *' } },
      );
    });

    it('passes interval schedule to Sentry when provided', async () => {
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      createCronLogger('interval-cron', { type: 'interval', value: 30, unit: 'minute' });

      expect(mockCaptureCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({ monitorSlug: 'interval-cron', status: 'in_progress' }),
        { schedule: { type: 'interval', value: 30, unit: 'minute' } },
      );
    });

    it('does not throw if Sentry captureCheckIn throws', async () => {
      mockCaptureCheckIn.mockImplementationOnce(() => {
        throw new Error('Sentry DSN not configured');
      });
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      // Should not throw even with Sentry broken
      expect(() => createCronLogger('resilient-cron')).not.toThrow();
    });

    it('does not throw if Sentry throws on completion', async () => {
      // First call (in_progress) succeeds, second (ok/error) throws
      mockCaptureCheckIn.mockReturnValueOnce('mock-check-in-id').mockImplementationOnce(() => {
        throw new Error('Sentry network error');
      });
      const { createCronLogger } = await import('@/lib/api/cron-logger');
      const cronLog = createCronLogger('resilient-completion-cron');
      await expect(cronLog.success()).resolves.toBeUndefined();
    });
  });
});
