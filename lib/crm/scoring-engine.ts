/**
 * Lead Scoring Engine — Pure function that evaluates scoring rules against lead data.
 *
 * Each rule checks a lead field with an operator and returns points if matched.
 * The engine sums all matching rule scores, grouped by category.
 */

export interface ScoringRule {
  id: string;
  name: string;
  field_name: string;
  operator: string;
  value: string;
  score_impact: number;
  category: 'fit' | 'intent' | 'engagement';
  is_active: boolean;
}

export interface RuleResult {
  rule_id: string;
  rule_name: string;
  field_name: string;
  operator: string;
  expected_value: string;
  actual_value: unknown;
  matched: boolean;
  score_impact: number;
  category: string;
}

export interface ScoringResult {
  total_score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
  rule_results: RuleResult[];
}

function toStr(fieldValue: unknown): string | null {
  if (fieldValue === null || fieldValue === undefined) return null;
  return String(fieldValue).toLowerCase();
}

function toNum(fieldValue: unknown, ruleValue: string): { num: number; ruleNum: number } | null {
  if (fieldValue === null || fieldValue === undefined) return null;
  const num = Number(fieldValue);
  const ruleNum = Number(ruleValue);
  if (isNaN(num) || isNaN(ruleNum)) return null;
  return { num, ruleNum };
}

type OperatorFn = (fieldValue: unknown, ruleValue: string) => boolean;

const OPERATOR_MAP: Record<string, OperatorFn> = {
  equals: (f, r) => {
    const s = toStr(f);
    return s !== null && s === r.toLowerCase();
  },
  not_equals: (f, r) => {
    const s = toStr(f);
    return s === null || s !== r.toLowerCase();
  },
  contains: (f, r) => {
    const s = toStr(f);
    return s !== null && s.includes(r.toLowerCase());
  },
  not_contains: (f, r) => {
    const s = toStr(f);
    return s === null || !s.includes(r.toLowerCase());
  },
  greater_than: (f, r) => {
    const n = toNum(f, r);
    return n !== null && n.num > n.ruleNum;
  },
  less_than: (f, r) => {
    const n = toNum(f, r);
    return n !== null && n.num < n.ruleNum;
  },
  greater_than_or_equal: (f, r) => {
    const n = toNum(f, r);
    return n !== null && n.num >= n.ruleNum;
  },
  less_than_or_equal: (f, r) => {
    const n = toNum(f, r);
    return n !== null && n.num <= n.ruleNum;
  },
  exists: (f) => f !== null && f !== undefined && f !== '',
  not_exists: (f) => f === null || f === undefined || f === '',
  starts_with: (f, r) => {
    const s = toStr(f);
    return s !== null && s.startsWith(r.toLowerCase());
  },
  ends_with: (f, r) => {
    const s = toStr(f);
    return s !== null && s.endsWith(r.toLowerCase());
  },
  in_set: (f, r) => {
    if (f === null || f === undefined || f === '') return false;
    const strField = String(f).toLowerCase().trim();
    return r.split('|').some((item) => item.toLowerCase().trim() === strField);
  },
  contains_any: (f, r) => {
    if (f === null || f === undefined || f === '') return false;
    const strField = String(f).toLowerCase();
    return r.split('|').some((item) => strField.includes(item.toLowerCase().trim()));
  },
};

/**
 * Evaluate a single operator against field value.
 * All comparisons are case-insensitive for string values.
 */
export function evaluateOperator(
  fieldValue: unknown,
  operator: string,
  ruleValue: string,
): boolean {
  const fn = OPERATOR_MAP[operator];
  return fn ? fn(fieldValue, ruleValue) : false;
}

/**
 * Resolve a dot-notation path to a nested value.
 * e.g. getNestedValue(obj, 'enrichment_data.google_maps.google_rating')
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (curr, key) =>
        curr && typeof curr === 'object' ? (curr as Record<string, unknown>)[key] : undefined,
      obj,
    );
}

/**
 * Score a lead against an array of scoring rules.
 * Only active rules are evaluated. Returns total and per-category scores.
 * Supports dot-notation field names for nested enrichment_data access.
 */
export function scoreLead(leadData: Record<string, unknown>, rules: ScoringRule[]): ScoringResult {
  const ruleResults: RuleResult[] = [];
  let fitScore = 0;
  let intentScore = 0;
  let engagementScore = 0;

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const fieldValue = rule.field_name.includes('.')
      ? getNestedValue(leadData, rule.field_name)
      : leadData[rule.field_name];
    const matched = evaluateOperator(fieldValue, rule.operator, rule.value);

    ruleResults.push({
      rule_id: rule.id,
      rule_name: rule.name,
      field_name: rule.field_name,
      operator: rule.operator,
      expected_value: rule.value,
      actual_value: fieldValue,
      matched,
      score_impact: matched ? rule.score_impact : 0,
      category: rule.category,
    });

    if (matched) {
      switch (rule.category) {
        case 'fit':
          fitScore += rule.score_impact;
          break;
        case 'intent':
          intentScore += rule.score_impact;
          break;
        case 'engagement':
          engagementScore += rule.score_impact;
          break;
      }
    }
  }

  // Cap each dimension to match workstation scoring (max total = 100)
  const cappedFit = Math.min(Math.max(fitScore, 0), 40);
  const cappedIntent = Math.min(Math.max(intentScore, 0), 35);
  const cappedEngagement = Math.min(Math.max(engagementScore, 0), 25);

  return {
    total_score: cappedFit + cappedIntent + cappedEngagement,
    fit_score: cappedFit,
    intent_score: cappedIntent,
    engagement_score: cappedEngagement,
    rule_results: ruleResults,
  };
}
