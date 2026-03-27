process.env.AI_ENABLED = 'true';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/ai/agents/insight-engine', () => ({
  generateInsights: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { GET as POST } from '@/app/api/cron/generate-insights/route';
import { generateInsights } from '@/lib/ai/agents/insight-engine';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import { makeRequest } from '../../helpers/mock-request';

const mockVerifyCronAuth = vi.mocked(verifyCronAuth);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGenerateInsights = vi.mocked(generateInsights);

function makeCronRequest() {
  return makeRequest('/api/cron/generate-insights', { method: 'GET' });
}

function mockOrgsClient(orgs: { id: string }[], error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data: orgs, error });
  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

describe('POST /api/cron/generate-insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns success with no orgs', async () => {
    mockCreateServiceClient.mockReturnValue(mockOrgsClient([]) as any);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('No organizations found');
    expect(mockGenerateInsights).not.toHaveBeenCalled();
  });

  it('calls generateInsights for each org', async () => {
    const orgs = [{ id: 'org-1' }, { id: 'org-2' }];
    mockCreateServiceClient.mockReturnValue(mockOrgsClient(orgs) as any);
    mockGenerateInsights.mockResolvedValue({ generated: 3, skipped: 1, errors: 0 });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    expect(mockGenerateInsights).toHaveBeenCalledTimes(2);
    expect(mockGenerateInsights).toHaveBeenCalledWith('org-1');
    expect(mockGenerateInsights).toHaveBeenCalledWith('org-2');
  });

  it('aggregates results across orgs', async () => {
    const orgs = [{ id: 'org-1' }, { id: 'org-2' }, { id: 'org-3' }];
    mockCreateServiceClient.mockReturnValue(mockOrgsClient(orgs) as any);

    mockGenerateInsights
      .mockResolvedValueOnce({ generated: 5, skipped: 2, errors: 0 })
      .mockResolvedValueOnce({ generated: 3, skipped: 0, errors: 1 })
      .mockResolvedValueOnce({ generated: 1, skipped: 4, errors: 0 });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.generated).toBe(9);
    expect(body.skipped).toBe(6);
    expect(body.errors).toBe(1);
    expect(body.orgs_processed).toBe(3);
  });

  it('handles generateInsights failure gracefully', async () => {
    const orgs = [{ id: 'org-1' }, { id: 'org-2' }];
    mockCreateServiceClient.mockReturnValue(mockOrgsClient(orgs) as any);

    mockGenerateInsights
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ generated: 2, skipped: 0, errors: 0 });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.generated).toBe(2);
    expect(body.errors).toBe(1); // the failed org counts as 1 error
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns 500 when org fetch fails', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockOrgsClient(null as any, { message: 'DB unavailable' }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB unavailable');
    expect(mockGenerateInsights).not.toHaveBeenCalled();
  });

  it('response includes timestamp', async () => {
    const orgs = [{ id: 'org-1' }];
    mockCreateServiceClient.mockReturnValue(mockOrgsClient(orgs) as any);
    mockGenerateInsights.mockResolvedValue({ generated: 1, skipped: 0, errors: 0 });

    const res = await POST(makeCronRequest());
    const body = await res.json();
    expect(body.timestamp).toBeDefined();
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
