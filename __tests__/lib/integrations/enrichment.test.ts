import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  enrichLead,
  type EnrichmentResult,
  mergeEnrichmentData,
} from '@/lib/integrations/enrichment';

// Mock the enrichment sources module
vi.mock('@/lib/integrations/enrichment-sources', () => ({
  enrichFromApolloMatch: vi.fn(),
  enrichFromBrave: vi.fn(),
  enrichFromTavily: vi.fn(),
  enrichFromGoogleMaps: vi.fn(),
}));

import {
  enrichFromApolloMatch,
  enrichFromBrave,
  enrichFromGoogleMaps,
  enrichFromTavily,
} from '@/lib/integrations/enrichment-sources';

const mockApollo = vi.mocked(enrichFromApolloMatch);
const mockBrave = vi.mocked(enrichFromBrave);
const mockTavily = vi.mocked(enrichFromTavily);
const mockGoogleMaps = vi.mocked(enrichFromGoogleMaps);

describe('mergeEnrichmentData', () => {
  it('merges a successful result into an empty base', () => {
    const results: EnrichmentResult[] = [
      { source: 'google_maps', data: { rating: 4.5 }, success: true },
    ];
    const merged = mergeEnrichmentData(null, results);
    expect(merged.google_maps).toBeDefined();
    expect((merged.google_maps as Record<string, unknown>).rating).toBe(4.5);
  });

  it('preserves existing data alongside new results', () => {
    const existing = { apollo: { employees: 50 } };
    const results: EnrichmentResult[] = [
      { source: 'google_maps', data: { rating: 4.5 }, success: true },
    ];
    const merged = mergeEnrichmentData(existing, results);
    expect(merged.apollo).toBeDefined();
    expect(merged.google_maps).toBeDefined();
  });

  it('skips failed enrichment results', () => {
    const results: EnrichmentResult[] = [
      { source: 'google_maps', data: {}, success: false, error: 'API error' },
    ];
    const merged = mergeEnrichmentData(null, results);
    expect(merged.google_maps).toBeUndefined();
  });

  it('attaches an enriched_at ISO timestamp to each successful result', () => {
    const results: EnrichmentResult[] = [
      { source: 'google_maps', data: { rating: 4.5 }, success: true },
    ];
    const merged = mergeEnrichmentData(null, results);
    const enrichedAt = (merged.google_maps as Record<string, unknown>).enriched_at;
    expect(enrichedAt).toBeDefined();
    expect(typeof enrichedAt).toBe('string');
    expect(new Date(enrichedAt as string).getTime()).not.toBeNaN();
  });

  it('returns empty object when results array is empty and existing is null', () => {
    const merged = mergeEnrichmentData(null, []);
    expect(Object.keys(merged)).toHaveLength(0);
  });

  it('does not mutate the existing object', () => {
    const existing = { apollo: { employees: 50 } };
    const results: EnrichmentResult[] = [
      { source: 'google_maps', data: { rating: 4.5 }, success: true },
    ];
    mergeEnrichmentData(existing, results);
    expect(existing).toEqual({ apollo: { employees: 50 } });
  });

  it('handles multiple results in a single call', () => {
    const results: EnrichmentResult[] = [
      { source: 'google_maps', data: { rating: 4.5 }, success: true },
      { source: 'brave', data: { website: 'example.com' }, success: true },
      { source: 'tavily', data: {}, success: false, error: 'rate limited' },
    ];
    const merged = mergeEnrichmentData(null, results);
    expect(merged.google_maps).toBeDefined();
    expect(merged.brave).toBeDefined();
    expect(merged.tavily).toBeUndefined();
  });
});

describe('enrichLead', () => {
  const baseLead = {
    id: 'lead-1',
    company_name: 'Acme Construction',
    domain: null,
    city: null,
    province: 'Ontario',
  };

  const baseContact = {
    first_name: 'John',
    last_name: 'Doe',
    linkedin_url: 'https://linkedin.com/in/johndoe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all sources return empty/minimal data
    mockApollo.mockResolvedValue({
      email: null,
      phone: null,
      website_url: null,
      linkedin_url: null,
      title: null,
      seniority: null,
      departments: null,
      employees: null,
      annual_revenue: null,
      founded_year: null,
      technologies: null,
      org_linkedin: null,
      org_industry: null,
      org_city: null,
      org_state: null,
    });
    mockBrave.mockResolvedValue({
      website: null,
      description: null,
      news_snippets: [],
      social_profiles: [],
    });
    mockTavily.mockResolvedValue({ answer: null, results: [] });
    mockGoogleMaps.mockResolvedValue({
      address: null,
      city: null,
      google_rating: null,
      google_reviews_count: null,
      business_types: null,
      business_status: null,
    });
  });

  it('calls all 4 sources when contact is provided', async () => {
    const { results } = await enrichLead(baseLead, baseContact);

    expect(mockApollo).toHaveBeenCalledOnce();
    expect(mockBrave).toHaveBeenCalledOnce();
    expect(mockTavily).toHaveBeenCalledOnce();
    expect(mockGoogleMaps).toHaveBeenCalledOnce();
    expect(results).toHaveLength(4);
  });

  it('skips Apollo Match when no contact provided', async () => {
    const { results } = await enrichLead(baseLead, null);

    expect(mockApollo).not.toHaveBeenCalled();
    expect(mockBrave).toHaveBeenCalledOnce();
    expect(mockTavily).toHaveBeenCalledOnce();
    expect(mockGoogleMaps).toHaveBeenCalledOnce();
    expect(results).toHaveLength(3);
  });

  it('skips Apollo Match when contact lacks first/last name', async () => {
    const { results } = await enrichLead(baseLead, {
      first_name: null,
      last_name: null,
      linkedin_url: null,
    });

    expect(mockApollo).not.toHaveBeenCalled();
    expect(results).toHaveLength(3);
  });

  it('sets domain side effect when Apollo Match returns website_url', async () => {
    mockApollo.mockResolvedValue({
      email: 'john@acme.com',
      phone: '555-1234',
      website_url: 'https://www.acmeconstruction.com/',
      linkedin_url: 'https://linkedin.com/in/johndoe',
      title: 'CEO',
      seniority: 'c_suite',
      departments: ['executive'],
      employees: 50,
      annual_revenue: 5000000,
      founded_year: 2010,
      technologies: null,
      org_linkedin: null,
      org_industry: 'construction',
      org_city: 'Toronto',
      org_state: 'Ontario',
    });

    const { sideEffects } = await enrichLead(baseLead, baseContact);

    expect(sideEffects.domain).toBe('www.acmeconstruction.com');
    expect(sideEffects.contactEmail).toBe('john@acme.com');
    expect(sideEffects.contactPhone).toBe('555-1234');
  });

  it('does not overwrite existing domain with Apollo result', async () => {
    mockApollo.mockResolvedValue({
      email: null,
      phone: null,
      website_url: 'https://newdomain.com',
      linkedin_url: null,
      title: null,
      seniority: null,
      departments: null,
      employees: null,
      annual_revenue: null,
      founded_year: null,
      technologies: null,
      org_linkedin: null,
      org_industry: null,
      org_city: null,
      org_state: null,
    });

    const leadWithDomain = { ...baseLead, domain: 'existing.com' };
    const { sideEffects } = await enrichLead(leadWithDomain, baseContact);

    expect(sideEffects.domain).toBeUndefined();
  });

  it('extracts domain from Brave when Apollo did not find one', async () => {
    mockBrave.mockResolvedValue({
      website: 'https://acmeconstruction.ca/about',
      description: 'Acme Construction is...',
      news_snippets: [],
      social_profiles: [],
    });

    const { sideEffects } = await enrichLead(baseLead, null);

    expect(sideEffects.domain).toBe('acmeconstruction.ca');
  });

  it('sets city side effect from Google Maps when lead has no city', async () => {
    mockGoogleMaps.mockResolvedValue({
      address: '123 Main St, Mississauga, ON L5B 1M2',
      city: 'Mississauga',
      google_rating: 4.5,
      google_reviews_count: 120,
      business_types: ['general_contractor'],
      business_status: 'OPERATIONAL',
    });

    const { sideEffects } = await enrichLead(baseLead, null);

    expect(sideEffects.city).toBe('Mississauga');
  });

  it('handles individual source failures gracefully', async () => {
    mockBrave.mockRejectedValue(new Error('Rate limited'));
    mockTavily.mockRejectedValue(new Error('API down'));

    const { results } = await enrichLead(baseLead, baseContact);

    const braveResult = results.find((r) => r.source === 'brave');
    const tavilyResult = results.find((r) => r.source === 'tavily');
    const apolloResult = results.find((r) => r.source === 'apollo_match');
    const mapsResult = results.find((r) => r.source === 'google_maps');

    expect(braveResult?.success).toBe(false);
    expect(braveResult?.error).toContain('Rate limited');
    expect(tavilyResult?.success).toBe(false);
    expect(apolloResult?.success).toBe(true);
    expect(mapsResult?.success).toBe(true);
  });

  it('handles all sources failing', async () => {
    mockApollo.mockRejectedValue(new Error('fail'));
    mockBrave.mockRejectedValue(new Error('fail'));
    mockTavily.mockRejectedValue(new Error('fail'));
    mockGoogleMaps.mockRejectedValue(new Error('fail'));

    const { results } = await enrichLead(baseLead, baseContact);

    expect(results).toHaveLength(4);
    expect(results.every((r) => !r.success)).toBe(true);
  });

  it('passes correct arguments to Apollo Match', async () => {
    await enrichLead(baseLead, baseContact);

    expect(mockApollo).toHaveBeenCalledWith({
      first_name: 'John',
      last_name: 'Doe',
      organization_name: 'Acme Construction',
      linkedin_url: 'https://linkedin.com/in/johndoe',
    });
  });

  it('passes company_name and province to Brave', async () => {
    await enrichLead(baseLead, null);

    expect(mockBrave).toHaveBeenCalledWith('Acme Construction', 'Ontario');
  });

  it('passes company_name and city to Tavily and Google Maps', async () => {
    const leadWithCity = { ...baseLead, city: 'Toronto' };
    await enrichLead(leadWithCity, null);

    expect(mockTavily).toHaveBeenCalledWith('Acme Construction', 'Toronto');
    expect(mockGoogleMaps).toHaveBeenCalledWith('Acme Construction', 'Toronto');
  });
});
