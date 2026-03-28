import { beforeEach, describe, expect, it, vi } from 'vitest';

// Supabase mock factory
function makeSupabase({
  pendingCOs = [] as unknown[],
  coError = null as unknown,
  permissions = [] as unknown[],
  existingKey = null as unknown,
  msgError = null as unknown,
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: msgError });
  const single = vi.fn().mockResolvedValue({ data: existingKey, error: null });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'change_orders') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: pendingCOs, error: coError }),
      };
    }
    if (table === 'portal_permissions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: permissions, error: null }),
      };
    }
    if (table === 'idempotency_keys') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single,
        insert,
      };
    }
    return { insert };
  });

  return { from };
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { runPortalReminderJob } from '@/lib/jobs/portalReminders';
import { createServiceClient } from '@/lib/supabase/server';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runPortalReminderJob', () => {
  it('returns zeros when no pending change orders', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase() as unknown as ReturnType<typeof createServiceClient>,
    );
    const result = await runPortalReminderJob();
    expect(result).toEqual({ sent: 0, skipped: 0, errors: [] });
  });

  it('returns DB error immediately on CO query failure', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ coError: { message: 'DB down' } }) as unknown as ReturnType<
        typeof createServiceClient
      >,
    );
    const result = await runPortalReminderJob();
    expect(result.errors).toEqual(['DB down']);
    expect(result.sent).toBe(0);
  });

  it('skips when idempotency key already exists', async () => {
    const co = {
      id: 'co-1',
      project_id: 'proj-1',
      co_number: '001',
      title: 'Demo',
      total_amount: 5000,
      submitted_at: '2026-01-01',
    };
    const perm = { portal_account_id: 'pa-1', permission_set: { approve_change_orders: true } };
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        pendingCOs: [co],
        permissions: [perm],
        existingKey: { id: 'key-1' },
      }) as unknown as ReturnType<typeof createServiceClient>,
    );
    const result = await runPortalReminderJob();
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  it('skips portal accounts without approve_change_orders permission', async () => {
    const co = {
      id: 'co-2',
      project_id: 'proj-2',
      co_number: '002',
      title: 'Test',
      total_amount: 1000,
      submitted_at: '2026-01-01',
    };
    const perm = { portal_account_id: 'pa-2', permission_set: { view_only: true } };
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ pendingCOs: [co], permissions: [perm] }) as unknown as unknown as ReturnType<
        typeof createServiceClient
      >,
    );
    const result = await runPortalReminderJob();
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
