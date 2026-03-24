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

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/integrations/enrichment-summarizer', () => ({
  summarizeEnrichment: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { POST } from '@/app/api/cron/summarize/route';
import { summarizeEnrichment } from '@/lib/integrations/enrichment-summarizer';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockSummarize = vi.mocked(summarizeEnrichment);

function makeCronRequest() {
  return makeRequest('/api/cron/summarize', { method: 'POST' });
}

const TEST_LEADS_WITH_DATA = [
  { id: 'lead-1', company_name: 'Acme Corp', enrichment_data: { revenue: 500000 } },
  { id: 'lead-2', company_name: 'BuildCo', enrichment_data: { employees: 50 } },
];

const TEST_LEADS_ALREADY_SUMMARIZED = [
  {
    id: 'lead-3',
    company_name: 'Done Corp',
    enrichment_data: { revenue: 100000, ai_summary: 'Existing summary' },
  },
];

describe('POST /api/cron/summarize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
    mockSummarize.mockResolvedValue('AI-generated summary of the company.');
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns success with zero processed when no leads', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({ tables: { leads: { data: [], error: null } } }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.message).toMatch(/No leads/);
  });

  it('returns 500 when leads query fails', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: { leads: { data: null, error: { message: 'DB connection error' } } },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB connection error');
  });

  it('returns message when all fetched leads already have summaries', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: { leads: { data: TEST_LEADS_ALREADY_SUMMARIZED, error: null } },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.message).toMatch(/already have summaries/);
  });

  it('summarizes leads missing ai_summary on happy path', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: TEST_LEADS_WITH_DATA, error: null },
        },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.errors).toBe(0);
    expect(body.total).toBe(2);
    expect(mockSummarize).toHaveBeenCalledTimes(2);
  });

  it('skips lead when summarizeEnrichment returns null', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: { leads: { data: TEST_LEADS_WITH_DATA, error: null } },
      }) as never,
    );
    mockSummarize.mockResolvedValue(null as unknown as string);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.errors).toBe(0);
  });

  it('counts errors when summarizeEnrichment throws', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: { leads: { data: [TEST_LEADS_WITH_DATA[0]], error: null } },
      }) as never,
    );
    mockSummarize.mockRejectedValue(new Error('Gemini rate limit exceeded'));

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.errors).toBe(1);
    expect(body.processed).toBe(0);
    expect(logger.error).toHaveBeenCalled();
  });
});
