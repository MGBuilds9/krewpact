import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}));

// Mock global fetch for Tavily Extract
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { deepResearchLead } from '@/lib/integrations/deep-research';
import { generateText } from 'ai';

const mockGenerateText = vi.mocked(generateText);

describe('deepResearchLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TAVILY_RESEARCH_API_KEY = 'test-key';
  });

  it('returns insufficient data message when no context', async () => {
    const result = await deepResearchLead('Empty Co', null, {});
    expect(result.research_report).toBe('Insufficient data for deep research.');
    expect(result.sources).toHaveLength(0);
    expect(result.researched_at).toBeTruthy();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('calls Tavily Extract with website URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [{ raw_content: 'Company website content here' }],
        }),
    });

    mockGenerateText.mockResolvedValue({
      text: 'Research report about Acme.',
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await deepResearchLead('Acme Corp', 'https://acme.com', {
      google_maps: { google_rating: 4.5 },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.tavily.com/extract',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
    expect(result.research_report).toBe('Research report about Acme.');
    expect(result.sources).toContain('https://acme.com');
  });

  it('prepends https:// to bare domains', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    mockGenerateText.mockResolvedValue({
      text: 'Report.',
    } as Awaited<ReturnType<typeof generateText>>);

    await deepResearchLead('Test', 'acme.com', {
      google_maps: { address: '123 Main St' },
    });

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(fetchBody.urls[0]).toBe('https://acme.com');
  });

  it('continues when Tavily Extract fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    mockGenerateText.mockResolvedValue({
      text: 'Report from other sources.',
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await deepResearchLead('Test Co', 'test.com', {
      brave: { description: 'Construction company' },
    });

    expect(result.research_report).toBe('Report from other sources.');
  });

  it('includes Google Maps context', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Report with maps data.',
    } as Awaited<ReturnType<typeof generateText>>);

    await deepResearchLead('Maps Co', null, {
      google_maps: {
        address: '789 Elm St, Toronto',
        google_rating: 4.2,
        google_reviews_count: 50,
        business_status: 'OPERATIONAL',
      },
    });

    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('789 Elm St');
    expect(prompt).toContain('4.2');
    expect(prompt).toContain('OPERATIONAL');
  });

  it('includes all enrichment sources in prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Full report.',
    } as Awaited<ReturnType<typeof generateText>>);

    await deepResearchLead('Full Co', null, {
      google_maps: { google_rating: 4.0 },
      brave: { description: 'Full service construction' },
      apollo_match: { title: 'CEO', email: 'ceo@full.com' },
      tavily: { answer: 'Leading builder in GTA' },
    });

    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('Full service construction');
    expect(prompt).toContain('CEO');
    expect(prompt).toContain('Leading builder');
  });

  it('returns timestamp in researched_at', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Report.',
    } as Awaited<ReturnType<typeof generateText>>);

    const before = new Date().toISOString();
    const result = await deepResearchLead('Test', null, {
      brave: { description: 'Test' },
    });
    const after = new Date().toISOString();

    expect(result.researched_at >= before).toBe(true);
    expect(result.researched_at <= after).toBe(true);
  });
});
