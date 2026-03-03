/**
 * Maps KrewPact opportunity data to ERPNext Opportunity doctype format.
 * Pure function — no side effects or database calls.
 */

export interface OpportunityMapInput {
  id: string;
  opportunity_name: string;
  estimated_revenue: number | null;
  probability_pct: number | null;
  target_close_date: string | null;
  division_id: string | null;
  account_id: string | null;
}

/**
 * Map a KrewPact opportunity to an ERPNext Opportunity document.
 */
export function mapOpportunityToErp(opp: OpportunityMapInput): Record<string, unknown> {
  return {
    opportunity_from: 'Customer',
    party_name: opp.account_id || '',
    opportunity_type: 'Sales',
    status: 'Open',
    expected_closing: opp.target_close_date,
    opportunity_amount: opp.estimated_revenue || 0,
    probability: opp.probability_pct || 0,
    currency: 'CAD',
    krewpact_id: opp.id,
    title: opp.opportunity_name,
  };
}
