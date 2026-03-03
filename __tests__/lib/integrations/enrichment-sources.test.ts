import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enrichFromApolloMatch,
  enrichFromBrave,
  enrichFromTavily,
  enrichFromGoogleMaps,
} from '@/lib/integrations/enrichment-sources';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enrichFromApolloMatch', () => {
  beforeEach(() => {
    vi.stubEnv('APOLLO_API_KEY', 'test-key');
  });

  it('returns person data on successful match', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          person: {
            email: 'john@acme.com',
            phone_numbers: [{ raw_number: '555-1234' }],
            organization: { website_url: 'https://acme.com' },
            linkedin_url: 'https://linkedin.com/in/john',
            title: 'CEO',
          },
        }),
    });

    const result = await enrichFromApolloMatch({
      first_name: 'John',
      last_name: 'Doe',
      organization_name: 'Acme',
    });

    expect(result.email).toBe('john@acme.com');
    expect(result.phone).toBe('555-1234');
    expect(result.website_url).toBe('https://acme.com');
    expect(result.title).toBe('CEO');
  });

  it('returns nulls when no person matched', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ person: null }),
    });

    const result = await enrichFromApolloMatch({
      first_name: 'Unknown',
      last_name: 'Person',
      organization_name: 'NoMatch Inc',
    });

    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.website_url).toBeNull();
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    await expect(
      enrichFromApolloMatch({
        first_name: 'John',
        last_name: 'Doe',
        organization_name: 'Acme',
      }),
    ).rejects.toThrow('Apollo Match API error 429');
  });

  it('throws when API key missing', async () => {
    vi.stubEnv('APOLLO_API_KEY', '');

    await expect(
      enrichFromApolloMatch({
        first_name: 'John',
        last_name: 'Doe',
        organization_name: 'Acme',
      }),
    ).rejects.toThrow('APOLLO_API_KEY not configured');
  });

  it('includes linkedin_url in request when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ person: null }),
    });

    await enrichFromApolloMatch({
      first_name: 'John',
      last_name: 'Doe',
      organization_name: 'Acme',
      linkedin_url: 'https://linkedin.com/in/john',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.linkedin_url).toBe('https://linkedin.com/in/john');
  });
});

describe('enrichFromBrave', () => {
  beforeEach(() => {
    vi.stubEnv('BRAVE_API_KEY', 'test-brave-key');
  });

  it('returns website and description from search results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          web: {
            results: [
              { url: 'https://acme.com', description: 'Acme Construction builds stuff' },
              { url: 'https://linkedin.com/company/acme', description: 'LinkedIn' },
            ],
          },
          news: {
            results: [{ title: 'Acme wins award' }],
          },
        }),
    });

    const result = await enrichFromBrave('Acme Construction', 'Ontario');

    expect(result.website).toBe('https://acme.com');
    expect(result.description).toBe('Acme Construction builds stuff');
    expect(result.news_snippets).toEqual(['Acme wins award']);
    expect(result.social_profiles).toEqual(['https://linkedin.com/company/acme']);
  });

  it('returns nulls when no results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ web: { results: [] } }),
    });

    const result = await enrichFromBrave('NoResults Inc', null);

    expect(result.website).toBeNull();
    expect(result.description).toBeNull();
  });

  it('throws when API key missing', async () => {
    vi.stubEnv('BRAVE_API_KEY', '');
    await expect(enrichFromBrave('Acme', null)).rejects.toThrow('BRAVE_API_KEY not configured');
  });
});

describe('enrichFromTavily', () => {
  beforeEach(() => {
    vi.stubEnv('TAVILY_API_KEY', 'test-tavily-key');
  });

  it('returns answer and results from API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          answer: 'Acme is a leading construction company.',
          results: [
            { title: 'About Acme', url: 'https://acme.com/about', content: 'Founded in 1990...' },
          ],
        }),
    });

    const result = await enrichFromTavily('Acme Construction', 'Toronto');

    expect(result.answer).toBe('Acme is a leading construction company.');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('About Acme');
  });

  it('sends city in query when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ answer: null, results: [] }),
    });

    await enrichFromTavily('Acme', 'Mississauga');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.query).toContain('Mississauga');
  });

  it('throws when API key missing', async () => {
    vi.stubEnv('TAVILY_API_KEY', '');
    await expect(enrichFromTavily('Acme', null)).rejects.toThrow('TAVILY_API_KEY not configured');
  });
});

describe('enrichFromGoogleMaps', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-maps-key');
  });

  it('returns place data with extracted city', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              formatted_address: '123 Main St, Mississauga, ON L5B 1M2, Canada',
              name: 'Acme Construction',
              rating: 4.5,
              user_ratings_total: 120,
              types: ['general_contractor'],
              business_status: 'OPERATIONAL',
            },
          ],
        }),
    });

    const result = await enrichFromGoogleMaps('Acme Construction', 'Mississauga');

    expect(result.address).toBe('123 Main St, Mississauga, ON L5B 1M2, Canada');
    expect(result.city).toBe('Mississauga');
    expect(result.google_rating).toBe(4.5);
    expect(result.google_reviews_count).toBe(120);
    expect(result.business_status).toBe('OPERATIONAL');
  });

  it('returns nulls when no candidates found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });

    const result = await enrichFromGoogleMaps('Unknown Company', null);

    expect(result.address).toBeNull();
    expect(result.google_rating).toBeNull();
  });

  it('searches by company name + Ontario when no city provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });

    await enrichFromGoogleMaps('Acme Construction', null);

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('Acme+Construction');
    expect(url).toContain('Ontario');
  });

  it('throws when API key missing', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
    await expect(enrichFromGoogleMaps('Acme', null)).rejects.toThrow(
      'GOOGLE_MAPS_API_KEY not configured',
    );
  });
});
