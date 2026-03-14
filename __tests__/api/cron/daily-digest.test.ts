/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.AI_ENABLED = 'true';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/cron-auth', () => ({ verifyCronAuth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/ai/agents/digest-builder', () => ({ buildDigest: vi.fn() }));
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { buildDigest } from '@/lib/ai/agents/digest-builder';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { POST } from '@/app/api/cron/daily-digest/route';
import { makeRequest } from '../../helpers/mock-request';

const mockVerifyCronAuth = vi.mocked(verifyCronAuth);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockBuildDigest = vi.mocked(buildDigest);
const mockSendEmail = vi.mocked(sendEmail);

function makeCronRequest() {
  return makeRequest('/api/cron/daily-digest', { method: 'POST' });
}

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

const TEST_USERS = [
  {
    id: 'u1',
    email: 'john@example.com',
    first_name: 'John',
    org_id: 'org-1',
    role_keys: ['project_manager'],
  },
];

const TEST_DIGEST = {
  sections: [{ title: 'Tasks Due Today', items: [{ label: 'Task A', value: 'pending' }] }],
  summary: 'You have 1 task due today.',
};

describe('POST /api/cron/daily-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
    mockBuildDigest.mockResolvedValue(TEST_DIGEST as any);
    mockSendEmail.mockResolvedValue({ success: true } as any);
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns success with no users', async () => {
    const usersChain = mockChain([]);
    mockCreateServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(usersChain) } as any);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('No users found');
    expect(mockBuildDigest).not.toHaveBeenCalled();
  });

  it('builds and sends digest for each user', async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return mockChain(TEST_USERS);
      }
      if (table === 'user_digests') {
        callCount++;
        // First call: .select().eq().eq().single() — not found (no existing digest)
        // Subsequent calls: .insert() and .update() — success
        if (callCount === 1) {
          return mockChain(null, { code: 'PGRST116', message: 'not found' });
        }
        return mockChain(null);
      }
      return mockChain([]);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockBuildDigest).toHaveBeenCalledOnce();
    expect(mockBuildDigest).toHaveBeenCalledWith('u1', 'org-1', ['project_manager']);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.users_processed).toBe(1);
  });

  it('skips user if digest already exists for today', async () => {
    const existingDigest = { id: 'digest-existing' };
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') return mockChain(TEST_USERS);
      if (table === 'user_digests') return mockChain(existingDigest); // already exists
      return mockChain([]);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockBuildDigest).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(body.sent).toBe(0);
  });

  it('handles buildDigest failure gracefully', async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') return mockChain(TEST_USERS);
      if (table === 'user_digests') {
        callCount++;
        if (callCount === 1) return mockChain(null, { code: 'PGRST116', message: 'not found' });
        return mockChain(null);
      }
      return mockChain([]);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    mockBuildDigest.mockRejectedValue(new Error('AI provider unavailable'));

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it('handles sendEmail failure gracefully', async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') return mockChain(TEST_USERS);
      if (table === 'user_digests') {
        callCount++;
        if (callCount === 1) return mockChain(null, { code: 'PGRST116', message: 'not found' });
        return mockChain(null);
      }
      return mockChain([]);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    mockSendEmail.mockResolvedValue({ success: false, error: 'SMTP timeout' } as any);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.errors).toBe(1);
    expect(logger.warn).toHaveBeenCalled();
  });
});
