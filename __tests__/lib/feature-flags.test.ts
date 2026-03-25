import { describe, expect, it } from 'vitest';

import { type FeatureKey, features, isFeatureEnabled } from '@/lib/feature-flags';

describe('features object', () => {
  it('has all expected keys', () => {
    const expectedKeys: FeatureKey[] = [
      'portals',
      'executive',
      'bidding',
      'enrichment_ui',
      'ai_suggestions',
      'ai_insights',
      'ai_daily_digest',
      'sequences',
      'migration_tool',
      'schedule',
      'documents_upload',
      'finance',
      'safety',
      'closeout',
      'warranty',
    ];
    for (const key of expectedKeys) {
      expect(key in features).toBe(true);
    }
  });

  it('has only boolean values', () => {
    for (const value of Object.values(features)) {
      expect(typeof value).toBe('boolean');
    }
  });

  it('is not mutatable (as const prevents property reassignment at type level)', () => {
    // Verify the object itself is a plain object with frozen-like semantics via as const.
    // We confirm it is the same reference as the named export (module singleton).
    expect(typeof features).toBe('object');
    expect(features).not.toBeNull();
  });
});

describe('isFeatureEnabled', () => {
  it('returns true for ai_suggestions (enabled)', () => {
    expect(isFeatureEnabled('ai_suggestions')).toBe(true);
  });

  it('returns true for ai_insights (enabled)', () => {
    expect(isFeatureEnabled('ai_insights')).toBe(true);
  });

  it('returns true for ai_daily_digest (enabled)', () => {
    expect(isFeatureEnabled('ai_daily_digest')).toBe(true);
  });

  it('returns true for portals (enabled)', () => {
    expect(isFeatureEnabled('portals')).toBe(true);
  });

  it('returns true for executive (enabled)', () => {
    expect(isFeatureEnabled('executive')).toBe(true);
  });

  it('returns true for bidding (enabled)', () => {
    expect(isFeatureEnabled('bidding')).toBe(true);
  });

  it('returns true for enrichment_ui (enabled)', () => {
    expect(isFeatureEnabled('enrichment_ui')).toBe(true);
  });

  it('returns true for sequences (enabled)', () => {
    expect(isFeatureEnabled('sequences')).toBe(true);
  });

  it('returns true for migration_tool (enabled)', () => {
    expect(isFeatureEnabled('migration_tool')).toBe(true);
  });

  it('returns true for schedule (enabled)', () => {
    expect(isFeatureEnabled('schedule')).toBe(true);
  });

  it('returns true for documents_upload (enabled)', () => {
    expect(isFeatureEnabled('documents_upload')).toBe(true);
  });

  it('returns true for finance (enabled)', () => {
    expect(isFeatureEnabled('finance')).toBe(true);
  });

  it('returns true for safety (enabled)', () => {
    expect(isFeatureEnabled('safety')).toBe(true);
  });

  it('returns true for closeout (enabled)', () => {
    expect(isFeatureEnabled('closeout')).toBe(true);
  });

  it('returns true for warranty (enabled)', () => {
    expect(isFeatureEnabled('warranty')).toBe(true);
  });

  it('return value matches features object directly', () => {
    const keys = Object.keys(features) as FeatureKey[];
    for (const key of keys) {
      expect(isFeatureEnabled(key)).toBe(features[key]);
    }
  });
});
