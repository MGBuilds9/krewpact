import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { getOrgBranding } from '@/lib/tenant/branding';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function mockSupabase(brandingData: Record<string, unknown> | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: brandingData ? { branding: brandingData } : null,
      error: null,
    }),
  };
  mockCreateServiceClient.mockReturnValue({
    from: vi.fn().mockReturnValue(chain),
  } as never);
}

describe('getOrgBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module-level cache by re-importing would be complex,
    // so we test with unique org IDs per test to avoid cache hits
  });

  it('returns branding from org_settings when present', async () => {
    mockSupabase({
      company_name: 'Acme Construction',
      company_description: 'General contracting in GTA',
      erp_company: 'Acme Construction Inc.',
      logo_url: 'https://example.com/logo.png',
      footer_text: 'Acme Construction Co.',
      primary_color: '#1a1a2e',
      accent_color: '#e94560',
    });

    const result = await getOrgBranding('org-acme-' + Date.now());
    expect(result.company_name).toBe('Acme Construction');
    expect(result.company_description).toBe('General contracting in GTA');
    expect(result.erp_company).toBe('Acme Construction Inc.');
    expect(result.logo_url).toBe('https://example.com/logo.png');
    expect(result.footer_text).toBe('Acme Construction Co.');
    expect(result.primary_color).toBe('#1a1a2e');
    expect(result.accent_color).toBe('#e94560');
  });

  it('returns defaults when org_settings is missing', async () => {
    mockSupabase(null);

    const result = await getOrgBranding('org-missing-' + Date.now());
    expect(result.company_name).toBe('KrewPact');
    expect(result.company_description).toBe('');
    expect(result.erp_company).toBe('KrewPact');
    expect(result.logo_url).toBeNull();
    expect(result.footer_text).toBe('KrewPact');
    expect(result.primary_color).toBe('#2563eb');
  });

  it('fills erp_company from company_name when erp_company is not set', async () => {
    mockSupabase({ company_name: 'Demo Co.' });

    const result = await getOrgBranding('org-noerrp-' + Date.now());
    expect(result.erp_company).toBe('Demo Co.');
  });

  it('caches results for 60s', async () => {
    mockSupabase({ company_name: 'Cached Corp' });

    const orgId = 'org-cache-' + Date.now();
    const first = await getOrgBranding(orgId);
    expect(first.company_name).toBe('Cached Corp');

    // Second call should hit cache, not DB
    mockSupabase({ company_name: 'Updated Corp' });
    const second = await getOrgBranding(orgId);
    expect(second.company_name).toBe('Cached Corp');
    expect(mockCreateServiceClient).toHaveBeenCalledTimes(1);
  });
});
