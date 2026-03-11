import { describe, it, expect } from 'vitest';
import {
  evaluateOperator,
  scoreLead,
  getNestedValue,
  type ScoringRule,
} from '@/lib/crm/scoring-engine';

// ============================================================
// evaluateOperator — individual operator tests
// ============================================================
describe('evaluateOperator', () => {
  // --- equals ---
  it('equals: matches case-insensitive string', () => {
    expect(evaluateOperator('Referral', 'equals', 'referral')).toBe(true);
  });

  it('equals: returns false for non-match', () => {
    expect(evaluateOperator('website', 'equals', 'referral')).toBe(false);
  });

  it('equals: returns false for null', () => {
    expect(evaluateOperator(null, 'equals', 'referral')).toBe(false);
  });

  // --- not_equals ---
  it('not_equals: returns true for mismatch', () => {
    expect(evaluateOperator('website', 'not_equals', 'referral')).toBe(true);
  });

  it('not_equals: returns false for match', () => {
    expect(evaluateOperator('referral', 'not_equals', 'referral')).toBe(false);
  });

  it('not_equals: returns true for null', () => {
    expect(evaluateOperator(null, 'not_equals', 'referral')).toBe(true);
  });

  // --- contains ---
  it('contains: matches substring', () => {
    expect(evaluateOperator('ABC Builders Inc', 'contains', 'builders')).toBe(true);
  });

  it('contains: returns false when not found', () => {
    expect(evaluateOperator('XYZ Corp', 'contains', 'builders')).toBe(false);
  });

  it('contains: returns false for null', () => {
    expect(evaluateOperator(null, 'contains', 'builders')).toBe(false);
  });

  // --- not_contains ---
  it('not_contains: returns true when substring absent', () => {
    expect(evaluateOperator('XYZ Corp', 'not_contains', 'builders')).toBe(true);
  });

  it('not_contains: returns false when substring present', () => {
    expect(evaluateOperator('ABC Builders', 'not_contains', 'builders')).toBe(false);
  });

  // --- greater_than ---
  it('greater_than: numeric comparison', () => {
    expect(evaluateOperator(100000, 'greater_than', '50000')).toBe(true);
  });

  it('greater_than: returns false when equal', () => {
    expect(evaluateOperator(50000, 'greater_than', '50000')).toBe(false);
  });

  it('greater_than: returns false for null', () => {
    expect(evaluateOperator(null, 'greater_than', '50000')).toBe(false);
  });

  it('greater_than: returns false for non-numeric string', () => {
    expect(evaluateOperator('abc', 'greater_than', '50000')).toBe(false);
  });

  // --- less_than ---
  it('less_than: numeric comparison', () => {
    expect(evaluateOperator(10000, 'less_than', '50000')).toBe(true);
  });

  it('less_than: returns false when greater', () => {
    expect(evaluateOperator(100000, 'less_than', '50000')).toBe(false);
  });

  // --- greater_than_or_equal ---
  it('greater_than_or_equal: matches equal', () => {
    expect(evaluateOperator(50000, 'greater_than_or_equal', '50000')).toBe(true);
  });

  it('greater_than_or_equal: matches greater', () => {
    expect(evaluateOperator(60000, 'greater_than_or_equal', '50000')).toBe(true);
  });

  // --- less_than_or_equal ---
  it('less_than_or_equal: matches equal', () => {
    expect(evaluateOperator(50000, 'less_than_or_equal', '50000')).toBe(true);
  });

  it('less_than_or_equal: matches less', () => {
    expect(evaluateOperator(40000, 'less_than_or_equal', '50000')).toBe(true);
  });

  // --- exists ---
  it('exists: returns true for truthy value', () => {
    expect(evaluateOperator('something', 'exists', '')).toBe(true);
  });

  it('exists: returns false for null', () => {
    expect(evaluateOperator(null, 'exists', '')).toBe(false);
  });

  it('exists: returns false for empty string', () => {
    expect(evaluateOperator('', 'exists', '')).toBe(false);
  });

  it('exists: returns true for zero (non-empty)', () => {
    expect(evaluateOperator(0, 'exists', '')).toBe(true);
  });

  // --- not_exists ---
  it('not_exists: returns true for null', () => {
    expect(evaluateOperator(null, 'not_exists', '')).toBe(true);
  });

  it('not_exists: returns true for empty string', () => {
    expect(evaluateOperator('', 'not_exists', '')).toBe(true);
  });

  it('not_exists: returns false for truthy value', () => {
    expect(evaluateOperator('value', 'not_exists', '')).toBe(false);
  });

  // --- starts_with ---
  it('starts_with: matches prefix', () => {
    expect(evaluateOperator('MDM Contracting', 'starts_with', 'mdm')).toBe(true);
  });

  it('starts_with: returns false for non-prefix', () => {
    expect(evaluateOperator('ABC Corp', 'starts_with', 'mdm')).toBe(false);
  });

  // --- ends_with ---
  it('ends_with: matches suffix', () => {
    expect(evaluateOperator('test@example.com', 'ends_with', '.com')).toBe(true);
  });

  it('ends_with: returns false for non-suffix', () => {
    expect(evaluateOperator('test@example.org', 'ends_with', '.com')).toBe(false);
  });

  // --- unknown operator ---
  it('unknown operator: returns false', () => {
    expect(evaluateOperator('value', 'banana_split', 'test')).toBe(false);
  });
});

// ============================================================
// getNestedValue — dot-notation path resolution
// ============================================================
describe('getNestedValue', () => {
  it('resolves top-level key', () => {
    expect(getNestedValue({ name: 'test' }, 'name')).toBe('test');
  });

  it('resolves nested key', () => {
    const obj = { enrichment_data: { google_maps: { google_rating: 4.5 } } };
    expect(getNestedValue(obj, 'enrichment_data.google_maps.google_rating')).toBe(4.5);
  });

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ a: { b: 1 } }, 'a.c')).toBeUndefined();
  });

  it('returns undefined for null intermediate', () => {
    expect(getNestedValue({ a: null } as Record<string, unknown>, 'a.b')).toBeUndefined();
  });

  it('resolves boolean values', () => {
    expect(getNestedValue({ a: { active: true } }, 'a.active')).toBe(true);
  });

  it('resolves empty string', () => {
    expect(getNestedValue({ a: { val: '' } }, 'a.val')).toBe('');
  });
});

// ============================================================
// scoreLead — integration of engine with rules
// ============================================================
describe('scoreLead', () => {
  function makeRule(overrides: Partial<ScoringRule> = {}): ScoringRule {
    return {
      id: 'rule-1',
      name: 'Test Rule',
      field_name: 'source',
      operator: 'equals',
      value: 'referral',
      score_impact: 20,
      category: 'fit',
      is_active: true,
      ...overrides,
    };
  }

  it('returns zero score with no rules', () => {
    const result = scoreLead({ source: 'website' }, []);
    expect(result.total_score).toBe(0);
    expect(result.rule_results).toHaveLength(0);
  });

  it('scores a matching rule', () => {
    const rules = [makeRule()];
    const result = scoreLead({ source: 'referral' }, rules);
    expect(result.total_score).toBe(20);
    expect(result.fit_score).toBe(20);
    expect(result.rule_results[0].matched).toBe(true);
  });

  it('does not score non-matching rule', () => {
    const rules = [makeRule()];
    const result = scoreLead({ source: 'website' }, rules);
    expect(result.total_score).toBe(0);
    expect(result.rule_results[0].matched).toBe(false);
    expect(result.rule_results[0].score_impact).toBe(0);
  });

  it('skips inactive rules', () => {
    const rules = [makeRule({ is_active: false })];
    const result = scoreLead({ source: 'referral' }, rules);
    expect(result.total_score).toBe(0);
    expect(result.rule_results).toHaveLength(0);
  });

  it('sums multiple matching rules', () => {
    const rules = [
      makeRule({ id: 'r1', score_impact: 15 }),
      makeRule({
        id: 'r2',
        field_name: 'estimated_value',
        operator: 'greater_than',
        value: '50000',
        score_impact: 25,
        category: 'intent',
      }),
    ];
    const lead = { source: 'referral', estimated_value: 100000 };
    const result = scoreLead(lead, rules);
    expect(result.total_score).toBe(40);
    expect(result.fit_score).toBe(15);
    expect(result.intent_score).toBe(25);
  });

  it('handles negative score impact', () => {
    const rules = [makeRule({ score_impact: -10 })];
    const result = scoreLead({ source: 'referral' }, rules);
    expect(result.total_score).toBe(-10);
    expect(result.fit_score).toBe(-10);
  });

  it('separates scores by category', () => {
    const rules = [
      makeRule({ id: 'r1', category: 'fit', score_impact: 10 }),
      makeRule({
        id: 'r2',
        field_name: 'company_name',
        operator: 'exists',
        value: '',
        score_impact: 15,
        category: 'intent',
      }),
      makeRule({
        id: 'r3',
        field_name: 'email',
        operator: 'exists',
        value: '',
        score_impact: 5,
        category: 'engagement',
      }),
    ];
    const lead = { source: 'referral', company_name: 'ABC Corp', email: 'test@test.com' };
    const result = scoreLead(lead, rules);
    expect(result.fit_score).toBe(10);
    expect(result.intent_score).toBe(15);
    expect(result.engagement_score).toBe(5);
    expect(result.total_score).toBe(30);
    expect(result.rule_results).toHaveLength(3);
  });

  it('returns correct rule_results metadata', () => {
    const rules = [makeRule()];
    const result = scoreLead({ source: 'referral' }, rules);
    const rr = result.rule_results[0];
    expect(rr.rule_id).toBe('rule-1');
    expect(rr.rule_name).toBe('Test Rule');
    expect(rr.field_name).toBe('source');
    expect(rr.operator).toBe('equals');
    expect(rr.expected_value).toBe('referral');
    expect(rr.actual_value).toBe('referral');
    expect(rr.matched).toBe(true);
    expect(rr.score_impact).toBe(20);
    expect(rr.category).toBe('fit');
  });

  // --- Nested field (dot-notation) scoring ---
  it('scores nested enrichment_data fields via dot-notation', () => {
    const rules = [
      makeRule({
        id: 'r-rating',
        field_name: 'enrichment_data.google_maps.google_rating',
        operator: 'greater_than',
        value: '4.0',
        score_impact: 10,
      }),
    ];
    const lead = {
      source: 'website',
      enrichment_data: {
        google_maps: { google_rating: 4.5 },
      },
    };
    const result = scoreLead(lead, rules);
    expect(result.total_score).toBe(10);
    expect(result.rule_results[0].matched).toBe(true);
    expect(result.rule_results[0].actual_value).toBe(4.5);
  });

  it('handles missing nested path gracefully', () => {
    const rules = [
      makeRule({
        field_name: 'enrichment_data.brave.website',
        operator: 'exists',
        value: '_',
        score_impact: 10,
      }),
    ];
    const lead = { source: 'website', enrichment_data: {} };
    const result = scoreLead(lead, rules);
    expect(result.total_score).toBe(0);
    expect(result.rule_results[0].matched).toBe(false);
  });

  it('scores mixed flat + nested rules correctly', () => {
    const rules = [
      makeRule({
        id: 'r1',
        field_name: 'industry',
        operator: 'contains',
        value: 'construction',
        score_impact: 15,
        category: 'fit',
      }),
      makeRule({
        id: 'r2',
        field_name: 'enrichment_data.google_maps.business_status',
        operator: 'equals',
        value: 'OPERATIONAL',
        score_impact: 5,
        category: 'fit',
      }),
      makeRule({
        id: 'r3',
        field_name: 'enrichment_data.apollo_match.email',
        operator: 'exists',
        value: '_',
        score_impact: 10,
        category: 'intent',
      }),
    ];
    const lead = {
      industry: 'General Construction',
      enrichment_data: {
        google_maps: { business_status: 'OPERATIONAL' },
        apollo_match: { email: 'john@acme.com' },
      },
    };
    const result = scoreLead(lead, rules);
    expect(result.fit_score).toBe(20);
    expect(result.intent_score).toBe(10);
    expect(result.total_score).toBe(30);
  });
});
