import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/queue/client', () => ({
  queue: {
    enqueue: vi.fn().mockResolvedValue({ id: 'job-123', status: 'pending' }),
  },
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST } from '@/app/api/admin/sync/trigger/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { queue } from '@/lib/queue/client';

const mockAuth = vi.mocked(auth);
const mockRoles = vi.mocked(getKrewpactRoles);
const mockEnqueue = vi.mocked(queue.enqueue);

describe('POST /api/admin/sync/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/admin/sync/trigger', { entity_type: 'account' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks platform_admin role', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockRoles.mockResolvedValue(['project_manager']);

    const res = await POST(makeJsonRequest('/api/admin/sync/trigger', { entity_type: 'account' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 for invalid entity_type', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(
      makeJsonRequest('/api/admin/sync/trigger', { entity_type: 'sales_invoice' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid entity_type');
  });

  it('returns 400 for missing entity_type', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(makeJsonRequest('/api/admin/sync/trigger', {}));
    expect(res.status).toBe(400);
  });

  it('enqueues job and returns confirmation for valid entity_type', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(makeJsonRequest('/api/admin/sync/trigger', { entity_type: 'account' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.job_id).toBe('job-123');
    expect(body.entity_type).toBe('account');
    expect(mockEnqueue).toHaveBeenCalledOnce();
  });

  it('returns 500 when enqueue fails', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);
    mockEnqueue.mockRejectedValueOnce(new Error('QStash unreachable'));

    const res = await POST(makeJsonRequest('/api/admin/sync/trigger', { entity_type: 'project' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to trigger sync');
  });

  it.each([
    'account',
    'contact',
    'estimate',
    'opportunity',
    'sales_order',
    'project',
    'task',
    'supplier',
    'expense_claim',
    'timesheet',
  ] as const)('accepts valid entity_type: %s', async (entity_type) => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(makeJsonRequest('/api/admin/sync/trigger', { entity_type }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entity_type).toBe(entity_type);
  });
});
