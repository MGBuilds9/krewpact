import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

vi.mock('@/lib/api/cron-logger', () => ({
  createCronLogger: vi.fn().mockReturnValue({
    success: vi.fn().mockResolvedValue(undefined),
    failure: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/jobs/portalReminders', () => ({
  runPortalReminderJob: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { makeRequest } from '@/__tests__/helpers';
import { GET } from '@/app/api/cron/portal-reminders/route';
import { runPortalReminderJob } from '@/lib/jobs/portalReminders';

const mockRunJob = vi.mocked(runPortalReminderJob);

function makeCronRequest() {
  return makeRequest('/api/cron/portal-reminders', { method: 'GET' });
}

describe('GET /api/cron/portal-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns success with job result on happy path', async () => {
    mockRunJob.mockResolvedValue({ reminders_sent: 3, skipped: 1 } as never);

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reminders_sent).toBe(3);
    expect(body.skipped).toBe(1);
    expect(mockRunJob).toHaveBeenCalledOnce();
  });

  it('returns success with zero when no reminders needed', async () => {
    mockRunJob.mockResolvedValue({ reminders_sent: 0, skipped: 0 } as never);

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reminders_sent).toBe(0);
  });

  it('returns 500 and logs error when job throws', async () => {
    mockRunJob.mockRejectedValue(new Error('Supabase connection failed'));

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Supabase connection failed');
  });

  it('returns 500 with unknown error message when job throws non-Error', async () => {
    mockRunJob.mockRejectedValue('string error');

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unknown error');
  });
});
