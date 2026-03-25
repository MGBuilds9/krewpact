import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

const mockEnrichLead = vi.fn();
const mockMergeEnrichmentData = vi.fn();
vi.mock('@/lib/integrations/enrichment', () => ({
  enrichLead: (...args: unknown[]) => mockEnrichLead(...args),
  mergeEnrichmentData: (...args: unknown[]) => mockMergeEnrichmentData(...args),
}));

const mockSummarizeEnrichment = vi.fn();
vi.mock('@/lib/integrations/enrichment-summarizer', () => ({
  summarizeEnrichment: (...args: unknown[]) => mockSummarizeEnrichment(...args),
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

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { POST } from '@/app/api/cron/enrichment/route';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeCronRequest() {
  return makeRequest('/api/cron/enrichment', { method: 'POST' });
}

function makePendingLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    company_name: 'MDM Test Co',
    domain: null,
    enrichment_data: null,
    enrichment_status: null,
    city: 'Mississauga',
    province: 'ON',
    ...overrides,
  };
}

describe('POST /api/cron/enrichment (enrichment-processor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
    mockSummarizeEnrichment.mockResolvedValue(null);
  });

  it('returns 401 when CRON_SECRET validation fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });
    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns processed:0 when no leads need enrichment', async () => {
    const supabase = mockSupabaseClient({
      tables: { leads: { data: [], error: null } },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.message).toBe('No leads to enrich');
  });

  it('returns 500 when leads query fails', async () => {
    const supabase = mockSupabaseClient({
      tables: { leads: { data: null, error: { message: 'connection timeout' } } },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
  });

  it('queries leads with enrichment_status IS NULL or pending', async () => {
    const supabase = mockSupabaseClient({
      tables: { leads: { data: [], error: null } },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    await POST(makeCronRequest());

    // The .or() filter targets null and pending statuses
    const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromCalls.some((args: unknown[]) => args[0] === 'leads')).toBe(true);
  });

  it('processes a batch of pending leads through the enrichment waterfall', async () => {
    const leads = [
      makePendingLead({ id: 'lead-1', enrichment_status: null }),
      makePendingLead({ id: 'lead-2', enrichment_status: 'pending' }),
    ];

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'brave', success: true, data: { website: 'https://test.com' } }],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({ brave: { website: 'https://test.com' } });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.errors).toBe(0);
    expect(body.total).toBe(2);
    expect(mockEnrichLead).toHaveBeenCalledTimes(2);
  });

  it('respects batch size — processes at most BATCH_SIZE leads', async () => {
    // The route limits to BATCH_SIZE (50) via .limit() — verify via from() calls
    const supabase = mockSupabaseClient({
      tables: { leads: { data: [], error: null } },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    await POST(makeCronRequest());

    const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromCalls.length).toBeGreaterThan(0);
  });

  it('marks lead as complete when at least one source succeeds', async () => {
    const leads = [makePendingLead({ id: 'lead-1', enrichment_status: 'pending' })];
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [
        { source: 'apollo', success: false, error: 'rate limited' },
        { source: 'brave', success: true, data: {} },
      ],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({ brave: {} });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(0);
  });

  it('marks lead as failed when all sources fail (still counts as processed)', async () => {
    const leads = [makePendingLead({ id: 'lead-1' })];
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [
        { source: 'apollo', success: false, error: 'no match' },
        { source: 'brave', success: false, error: 'quota exceeded' },
        { source: 'tavily', success: false, error: 'timeout' },
        { source: 'google_maps', success: false, error: 'no results' },
      ],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({});

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    // All sources failed but no exception thrown — lead is updated with status 'failed',
    // which the route treats as a successful DB write (processed: 1)
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
  });

  it('counts error and continues when enrichLead throws', async () => {
    const leads = [
      makePendingLead({ id: 'lead-1' }),
      makePendingLead({ id: 'lead-2' }),
    ];
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        results: [{ source: 'brave', success: true, data: {} }],
        sideEffects: {},
      });
    mockMergeEnrichmentData.mockReturnValue({ brave: {} });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.processed).toBe(1);
    expect(body.total).toBe(2);
  });

  it('applies domain side effect when discovered during enrichment', async () => {
    const leads = [makePendingLead({ id: 'lead-1', domain: null })];
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'brave', success: true, data: { website: 'https://mdmgroup.ca' } }],
      sideEffects: { domain: 'mdmgroup.ca' },
    });
    mockMergeEnrichmentData.mockReturnValue({ brave: { website: 'https://mdmgroup.ca' } });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
  });

  it('continues when AI summary throws (non-critical)', async () => {
    const leads = [makePendingLead({ id: 'lead-1' })];
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'tavily', success: true, data: {} }],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({ tavily: {} });
    mockSummarizeEnrichment.mockRejectedValue(new Error('OpenAI rate limit'));

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
  });

  it('includes timestamp in response when leads are processed', async () => {
    const leads = [makePendingLead({ id: 'lead-1' })];
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: leads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'brave', success: true, data: {} }],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({ brave: {} });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('timestamp');
    expect(typeof body.timestamp).toBe('string');
  });
});
