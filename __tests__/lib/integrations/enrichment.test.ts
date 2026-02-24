import { describe, it, expect } from 'vitest';
import { mergeEnrichmentData, type EnrichmentResult } from '@/lib/integrations/enrichment';

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
      { source: 'clearbit', data: { employees: 75 }, success: true },
      { source: 'linkedin', data: {}, success: false, error: 'rate limited' },
    ];
    const merged = mergeEnrichmentData(null, results);
    expect(merged.google_maps).toBeDefined();
    expect(merged.clearbit).toBeDefined();
    expect(merged.linkedin).toBeUndefined();
  });
});
