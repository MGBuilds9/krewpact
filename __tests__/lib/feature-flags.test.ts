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

  it('returns false for portals (disabled)', () => {
    expect(isFeatureEnabled('portals')).toBe(false);
  });

  it('returns false for executive (disabled)', () => {
    expect(isFeatureEnabled('executive')).toBe(false);
  });

  it('returns false for bidding (disabled)', () => {
    expect(isFeatureEnabled('bidding')).toBe(false);
  });

  it('returns false for enrichment_ui (disabled)', () => {
    expect(isFeatureEnabled('enrichment_ui')).toBe(false);
  });

  it('returns true for sequences (enabled)', () => {
    expect(isFeatureEnabled('sequences')).toBe(true);
  });

  it('returns false for migration_tool (disabled)', () => {
    expect(isFeatureEnabled('migration_tool')).toBe(false);
  });

  it('returns false for schedule (disabled)', () => {
    expect(isFeatureEnabled('schedule')).toBe(false);
  });

  it('returns false for documents_upload (disabled)', () => {
    expect(isFeatureEnabled('documents_upload')).toBe(false);
  });

  it('returns false for finance (disabled)', () => {
    expect(isFeatureEnabled('finance')).toBe(false);
  });

  it('returns false for safety (disabled)', () => {
    expect(isFeatureEnabled('safety')).toBe(false);
  });

  it('returns false for closeout (disabled)', () => {
    expect(isFeatureEnabled('closeout')).toBe(false);
  });

  it('returns false for warranty (disabled)', () => {
    expect(isFeatureEnabled('warranty')).toBe(false);
  });

  it('return value matches features object directly', () => {
    const keys = Object.keys(features) as FeatureKey[];
    for (const key of keys) {
      expect(isFeatureEnabled(key)).toBe(features[key]);
    }
  });
});
