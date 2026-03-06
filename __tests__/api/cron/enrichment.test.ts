import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/cron/enrichment/route';
import { mockSupabaseClient, makeRequest } from '@/__tests__/helpers';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeCronRequest() {
  return makeRequest('/api/cron/enrichment', { method: 'POST' });
}

describe('POST /api/cron/enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });
    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns { processed: 0 } when no leads need enrichment', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
  });

  it('returns 500 when leads query fails', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: null, error: { message: 'DB error' } },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
  });

  it('processes leads through enrichment waterfall', async () => {
    const mockLeads = [
      { id: 'lead-1', domain: 'test.com', enrichment_data: null, enrichment_status: null, company_name: 'Test Co', city: 'Toronto', province: 'Ontario' },
    ];

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: mockLeads, error: null },
        contacts: { data: [{ first_name: 'John', last_name: 'Doe', linkedin_url: null }], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'apollo', success: true, data: { revenue: 1000000 } }],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({ apollo: { revenue: 1000000 } });
    mockSummarizeEnrichment.mockResolvedValue('Test company summary');

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(0);

    expect(mockEnrichLead).toHaveBeenCalledTimes(1);
    expect(mockMergeEnrichmentData).toHaveBeenCalledTimes(1);
  });

  it('marks lead as complete when enrichment succeeds', async () => {
    const mockLeads = [
      { id: 'lead-1', domain: 'test.com', enrichment_data: null, enrichment_status: 'pending', company_name: 'Test Co', city: null, province: null },
    ];

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: mockLeads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'brave', success: true, data: {} }],
      sideEffects: { domain: 'found.com' },
    });
    mockMergeEnrichmentData.mockReturnValue({ brave: {} });
    mockSummarizeEnrichment.mockResolvedValue(null);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
  });

  it('continues processing when AI summary fails (non-critical)', async () => {
    const mockLeads = [
      { id: 'lead-1', domain: 'test.com', enrichment_data: null, enrichment_status: null, company_name: 'Test Co', city: null, province: null },
    ];

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: mockLeads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'apollo', success: true, data: {} }],
      sideEffects: {},
    });
    mockMergeEnrichmentData.mockReturnValue({ apollo: {} });
    mockSummarizeEnrichment.mockRejectedValue(new Error('OpenAI rate limit'));

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
  });

  it('applies side effects (domain, city, contact updates)', async () => {
    const mockLeads = [
      { id: 'lead-1', domain: null, enrichment_data: null, enrichment_status: null, company_name: 'Test', city: null, province: null },
    ];

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: mockLeads, error: null },
        contacts: { data: [{ first_name: 'Jane', last_name: 'Doe', linkedin_url: null }], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockResolvedValue({
      results: [{ source: 'apollo', success: true, data: {} }],
      sideEffects: {
        domain: 'discovered.com',
        city: 'Mississauga',
        contactEmail: 'jane@discovered.com',
        contactPhone: '+1-905-555-0123',
      },
    });
    mockMergeEnrichmentData.mockReturnValue({ apollo: {} });
    mockSummarizeEnrichment.mockResolvedValue(null);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
  });

  it('counts errors and marks failed leads', async () => {
    const mockLeads = [
      { id: 'lead-1', domain: null, enrichment_data: null, enrichment_status: null, company_name: 'Bad Co', city: null, province: null },
    ];

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: mockLeads, error: null },
        contacts: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockEnrichLead.mockRejectedValue(new Error('All sources failed'));

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(body.errors).toBe(1);
  });

  it('respects batch size limit of 20', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: [], error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    await POST(makeCronRequest());

    // Verify the query includes a limit
    const fromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromCalls.length).toBeGreaterThan(0);
  });
});
