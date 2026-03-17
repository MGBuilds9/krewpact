import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}));

import { generateText } from 'ai';

import { summarizeEnrichment } from '@/lib/integrations/enrichment-summarizer';

const mockGenerateText = vi.mocked(generateText);

describe('summarizeEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string when no enrichment data available', async () => {
    const result = await summarizeEnrichment('Acme Corp', {});
    expect(result).toBe('');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('calls generateText with Google Maps data', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Acme Corp is a construction company in Mississauga.',
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await summarizeEnrichment('Acme Corp', {
      google_maps: {
        address: '123 Main St, Mississauga, ON',
        google_rating: 4.5,
        google_reviews_count: 120,
        business_status: 'OPERATIONAL',
      },
    });

    expect(result).toBe('Acme Corp is a construction company in Mississauga.');
    expect(mockGenerateText).toHaveBeenCalledOnce();
    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('123 Main St');
    expect(prompt).toContain('4.5');
  });

  it('includes Brave web data in prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Summary with web data.',
    } as Awaited<ReturnType<typeof generateText>>);

    await summarizeEnrichment('Test Co', {
      brave: {
        website: 'https://testco.ca',
        description: 'Leading construction firm in Ontario',
      },
    });

    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('testco.ca');
    expect(prompt).toContain('Leading construction firm');
  });

  it('includes Apollo contact data in prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Summary with contact.',
    } as Awaited<ReturnType<typeof generateText>>);

    await summarizeEnrichment('Test Co', {
      apollo_match: {
        email: 'john@test.com',
        title: 'CEO',
      },
    });

    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('CEO');
    expect(prompt).toContain('john@test.com');
  });

  it('includes Tavily answer in prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Summary with research.',
    } as Awaited<ReturnType<typeof generateText>>);

    await summarizeEnrichment('Test Co', {
      tavily: {
        answer: 'Test Co specializes in commercial renovations',
      },
    });

    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('commercial renovations');
  });

  it('combines all sources in prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Comprehensive summary.',
    } as Awaited<ReturnType<typeof generateText>>);

    await summarizeEnrichment('Full Co', {
      google_maps: { google_rating: 4.8, address: '456 Oak Ave' },
      brave: { website: 'fullco.ca', description: 'Full service builder' },
      apollo_match: { title: 'VP Operations' },
      tavily: { answer: 'Award-winning firm' },
    });

    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('Full Co');
    expect(prompt).toContain('4.8');
    expect(prompt).toContain('fullco.ca');
    expect(prompt).toContain('VP Operations');
    expect(prompt).toContain('Award-winning');
  });

  it('trims whitespace from response', async () => {
    mockGenerateText.mockResolvedValue({
      text: '  Trimmed summary.  \n',
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await summarizeEnrichment('Test', {
      google_maps: { google_rating: 4.0 },
    });

    expect(result).toBe('Trimmed summary.');
  });
});
