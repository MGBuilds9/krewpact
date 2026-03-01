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
  division_id: string | null;
  priority: number | null;
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

/**
 * Evaluate a single operator against field value.
 * All comparisons are case-insensitive for string values.
 */
export function evaluateOperator(
  fieldValue: unknown,
  operator: string,
  ruleValue: string,
): boolean {
  switch (operator) {
    case 'equals': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const strField = String(fieldValue).toLowerCase();
      return strField === ruleValue.toLowerCase();
    }

    case 'not_equals': {
      if (fieldValue === null || fieldValue === undefined) return true;
      const strField = String(fieldValue).toLowerCase();
      return strField !== ruleValue.toLowerCase();
    }

    case 'contains': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const strField = String(fieldValue).toLowerCase();
      return strField.includes(ruleValue.toLowerCase());
    }

    case 'not_contains': {
      if (fieldValue === null || fieldValue === undefined) return true;
      const strField = String(fieldValue).toLowerCase();
      return !strField.includes(ruleValue.toLowerCase());
    }

    case 'greater_than': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const num = Number(fieldValue);
      const ruleNum = Number(ruleValue);
      if (isNaN(num) || isNaN(ruleNum)) return false;
      return num > ruleNum;
    }

    case 'less_than': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const num = Number(fieldValue);
      const ruleNum = Number(ruleValue);
      if (isNaN(num) || isNaN(ruleNum)) return false;
      return num < ruleNum;
    }

    case 'greater_than_or_equal': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const num = Number(fieldValue);
      const ruleNum = Number(ruleValue);
      if (isNaN(num) || isNaN(ruleNum)) return false;
      return num >= ruleNum;
    }

    case 'less_than_or_equal': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const num = Number(fieldValue);
      const ruleNum = Number(ruleValue);
      if (isNaN(num) || isNaN(ruleNum)) return false;
      return num <= ruleNum;
    }

    case 'exists': {
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== ''
      );
    }

    case 'not_exists': {
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === ''
      );
    }

    case 'starts_with': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const strField = String(fieldValue).toLowerCase();
      return strField.startsWith(ruleValue.toLowerCase());
    }

    case 'ends_with': {
      if (fieldValue === null || fieldValue === undefined) return false;
      const strField = String(fieldValue).toLowerCase();
      return strField.endsWith(ruleValue.toLowerCase());
    }

    default:
      return false;
  }
}

/**
 * Resolve a dot-notation path to a nested value.
 * e.g. getNestedValue(obj, 'enrichment_data.google_maps.google_rating')
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
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
export function scoreLead(
  leadData: Record<string, unknown>,
  rules: ScoringRule[],
): ScoringResult {
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

  return {
    total_score: fitScore + intentScore + engagementScore,
    fit_score: fitScore,
    intent_score: intentScore,
    engagement_score: engagementScore,
    rule_results: ruleResults,
  };
}
