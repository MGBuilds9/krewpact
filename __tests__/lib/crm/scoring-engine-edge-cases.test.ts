import { describe, it, expect } from 'vitest';
import {
  evaluateOperator,
  scoreLead,
  getNestedValue,
  type ScoringRule,
} from '@/lib/crm/scoring-engine';

// ============================================================
// Edge cases for evaluateOperator
// ============================================================
describe('evaluateOperator edge cases', () => {
  it('equals: handles numeric field as string comparison', () => {
    expect(evaluateOperator(42, 'equals', '42')).toBe(true);
  });

  it('contains: handles numeric toString', () => {
    expect(evaluateOperator(12345, 'contains', '234')).toBe(true);
  });

  it('greater_than: handles string numeric values', () => {
    expect(evaluateOperator('100', 'greater_than', '50')).toBe(true);
  });

  it('greater_than: handles float values', () => {
    expect(evaluateOperator(4.5, 'greater_than', '4.0')).toBe(true);
  });

  it('greater_than: handles equal floats', () => {
    expect(evaluateOperator(4.0, 'greater_than', '4.0')).toBe(false);
  });

  it('less_than: handles zero', () => {
    expect(evaluateOperator(0, 'less_than', '1')).toBe(true);
  });

  it('exists: returns true for false boolean', () => {
    expect(evaluateOperator(false, 'exists', '')).toBe(true);
  });

  it('exists: returns true for number zero', () => {
    expect(evaluateOperator(0, 'exists', '')).toBe(true);
  });

  it('not_exists: returns false for zero', () => {
    expect(evaluateOperator(0, 'not_exists', '')).toBe(false);
  });

  it('not_contains: handles undefined', () => {
    expect(evaluateOperator(undefined, 'not_contains', 'test')).toBe(true);
  });

  it('starts_with: handles null', () => {
    expect(evaluateOperator(null, 'starts_with', 'test')).toBe(false);
  });

  it('ends_with: handles undefined', () => {
    expect(evaluateOperator(undefined, 'ends_with', '.com')).toBe(false);
  });

  it('greater_than_or_equal: boundary float', () => {
    expect(evaluateOperator(4.0, 'greater_than_or_equal', '4.0')).toBe(true);
  });

  it('less_than_or_equal: boundary float', () => {
    expect(evaluateOperator(4.0, 'less_than_or_equal', '4.0')).toBe(true);
  });

  it('equals: handles boolean toString', () => {
    expect(evaluateOperator(true, 'equals', 'true')).toBe(true);
  });
});

// ============================================================
// Edge cases for getNestedValue
// ============================================================
describe('getNestedValue edge cases', () => {
  it('resolves deeply nested path (4 levels)', () => {
    const obj = { a: { b: { c: { d: 'deep' } } } };
    expect(getNestedValue(obj, 'a.b.c.d')).toBe('deep');
  });

  it('returns undefined for primitive intermediate', () => {
    const obj = { a: 'string' };
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
  });

  it('handles array at intermediate level', () => {
    const obj = { a: [1, 2, 3] };
    // Arrays are objects, so numeric key access works
    expect(getNestedValue(obj, 'a.0')).toBe(1);
  });

  it('handles empty string path segment', () => {
    const obj = { '': { nested: 'val' } };
    expect(getNestedValue(obj, '.nested')).toBe('val');
  });

  it('returns undefined for completely missing top-level', () => {
    expect(getNestedValue({}, 'missing.path')).toBeUndefined();
  });

  it('handles numeric values in nested objects', () => {
    const obj = { enrichment_data: { google_maps: { google_rating: 0 } } };
    expect(getNestedValue(obj, 'enrichment_data.google_maps.google_rating')).toBe(0);
  });

  it('handles null values at leaf', () => {
    const obj = { a: { b: null } };
    expect(getNestedValue(obj, 'a.b')).toBeNull();
  });
});

// ============================================================
// Edge cases for scoreLead with enrichment data patterns
// ============================================================
describe('scoreLead enrichment edge cases', () => {
  function makeRule(overrides: Partial<ScoringRule> = {}): ScoringRule {
    return {
      id: 'rule-1',
      name: 'Test Rule',
      field_name: 'industry',
      operator: 'contains',
      value: 'construction',
      score_impact: 15,
      category: 'fit',
      is_active: true,
      ...overrides,
    };
  }

  it('handles lead with null enrichment_data', () => {
    const rules = [
      makeRule({
        field_name: 'enrichment_data.google_maps.google_rating',
        operator: 'greater_than',
        value: '4.0',
        score_impact: 10,
      }),
    ];
    const lead = { industry: 'Construction', enrichment_data: null };
    const result = scoreLead(lead, rules);
    // null enrichment_data → nested access returns undefined → no match
    expect(result.total_score).toBe(0);
    expect(result.rule_results[0].matched).toBe(false);
  });

  it('handles lead with empty enrichment_data object', () => {
    const rules = [
      makeRule({
        field_name: 'enrichment_data.brave.website',
        operator: 'exists',
        value: '_',
        score_impact: 10,
      }),
    ];
    const lead = { enrichment_data: {} };
    const result = scoreLead(lead, rules);
    expect(result.total_score).toBe(0);
  });

  it('scores zero rating correctly (not as missing)', () => {
    const rules = [
      makeRule({
        field_name: 'enrichment_data.google_maps.google_rating',
        operator: 'greater_than',
        value: '4.0',
        score_impact: 10,
      }),
    ];
    const lead = {
      enrichment_data: { google_maps: { google_rating: 0 } },
    };
    const result = scoreLead(lead, rules);
    expect(result.total_score).toBe(0);
    expect(result.rule_results[0].actual_value).toBe(0);
  });

  it('handles all 15 seed rules against a fully enriched lead', () => {
    // Simulate the actual seed rules matching against a well-enriched lead
    const rules: ScoringRule[] = [
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
        field_name: 'enrichment_data.google_maps.google_rating',
        operator: 'greater_than',
        value: '4.0',
        score_impact: 10,
        category: 'fit',
      }),
      makeRule({
        id: 'r3',
        field_name: 'enrichment_data.google_maps.google_reviews_count',
        operator: 'greater_than',
        value: '20',
        score_impact: 5,
        category: 'fit',
      }),
      makeRule({
        id: 'r4',
        field_name: 'enrichment_data.google_maps.business_status',
        operator: 'equals',
        value: 'OPERATIONAL',
        score_impact: 5,
        category: 'fit',
      }),
      makeRule({
        id: 'r5',
        field_name: 'province',
        operator: 'equals',
        value: 'Ontario',
        score_impact: 10,
        category: 'fit',
      }),
      makeRule({
        id: 'r6',
        field_name: 'city',
        operator: 'exists',
        value: '_',
        score_impact: 5,
        category: 'fit',
      }),
      makeRule({
        id: 'r7',
        field_name: 'enrichment_data.brave.website',
        operator: 'exists',
        value: '_',
        score_impact: 10,
        category: 'intent',
      }),
      makeRule({
        id: 'r8',
        field_name: 'enrichment_data.apollo_match.email',
        operator: 'exists',
        value: '_',
        score_impact: 10,
        category: 'intent',
      }),
      makeRule({
        id: 'r9',
        field_name: 'enrichment_data.brave.description',
        operator: 'contains',
        value: 'construction',
        score_impact: 5,
        category: 'intent',
      }),
      makeRule({
        id: 'r10',
        field_name: 'domain',
        operator: 'exists',
        value: '_',
        score_impact: 5,
        category: 'intent',
      }),
      makeRule({
        id: 'r11',
        field_name: 'status',
        operator: 'equals',
        value: 'contacted',
        score_impact: 15,
        category: 'engagement',
      }),
      makeRule({
        id: 'r12',
        field_name: 'status',
        operator: 'equals',
        value: 'qualified',
        score_impact: 20,
        category: 'engagement',
      }),
      makeRule({
        id: 'r13',
        field_name: 'enrichment_data.apollo_match.linkedin_url',
        operator: 'exists',
        value: '_',
        score_impact: 5,
        category: 'engagement',
      }),
      makeRule({
        id: 'r14',
        field_name: 'status',
        operator: 'equals',
        value: 'proposal',
        score_impact: 25,
        category: 'engagement',
      }),
      makeRule({
        id: 'r15',
        field_name: 'status',
        operator: 'equals',
        value: 'won',
        score_impact: 30,
        category: 'engagement',
      }),
    ];

    const lead = {
      industry: 'General Construction',
      province: 'Ontario',
      city: 'Mississauga',
      domain: 'acmeconstruction.ca',
      status: 'qualified',
      enrichment_data: {
        google_maps: {
          google_rating: 4.5,
          google_reviews_count: 120,
          business_status: 'OPERATIONAL',
        },
        brave: {
          website: 'https://acmeconstruction.ca',
          description: 'Leading construction company in the GTA',
        },
        apollo_match: {
          email: 'john@acme.com',
          linkedin_url: 'https://linkedin.com/in/john',
        },
      },
    };

    const result = scoreLead(lead, rules);

    // Fit: industry(15) + rating(10) + reviews(5) + operational(5) + ontario(10) + city(5) = 50
    expect(result.fit_score).toBe(50);

    // Intent: website(10) + email(10) + description(5) + domain(5) = 30
    expect(result.intent_score).toBe(30);

    // Engagement: qualified(20) + linkedin(5) = 25 (not contacted/proposal/won)
    expect(result.engagement_score).toBe(25);

    // Total: 50 + 30 + 25 = 105
    expect(result.total_score).toBe(105);
    expect(result.rule_results).toHaveLength(15);
  });

  it('handles lead with no matching rules', () => {
    const rules: ScoringRule[] = [
      makeRule({ field_name: 'industry', operator: 'contains', value: 'tech', score_impact: 15 }),
      makeRule({
        id: 'r2',
        field_name: 'province',
        operator: 'equals',
        value: 'British Columbia',
        score_impact: 10,
      }),
    ];
    const lead = { industry: 'Real Estate', province: 'Ontario' };
    const result = scoreLead(lead, rules);
    expect(result.total_score).toBe(0);
    expect(result.rule_results.every((r) => !r.matched)).toBe(true);
  });

  it('handles mixed active and inactive rules', () => {
    const rules: ScoringRule[] = [
      makeRule({ id: 'r1', is_active: true, score_impact: 15 }),
      makeRule({ id: 'r2', is_active: false, score_impact: 100 }),
      makeRule({
        id: 'r3',
        is_active: true,
        field_name: 'province',
        operator: 'equals',
        value: 'Ontario',
        score_impact: 10,
      }),
    ];
    const lead = { industry: 'Construction', province: 'Ontario' };
    const result = scoreLead(lead, rules);
    // Only active rules should be evaluated
    expect(result.total_score).toBe(25);
    expect(result.rule_results).toHaveLength(2); // Inactive rule not in results
  });
});
