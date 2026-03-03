/**
 * Lead conversion logic.
 * Pure validation function — no database or auth dependencies.
 *
 * A lead can be converted to an opportunity when:
 * - Lead stage is 'won' (already qualified and approved)
 * - Lead has not already been converted (no existing opportunity with this lead_id)
 */

export interface ConversionInput {
  lead: {
    id: string;
    stage: string;
    lead_name: string;
    division_id: string | null;
    estimated_value: number | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    source_channel: string | null;
  };
  existingOpportunityForLead: boolean;
  accountId?: string;
  contactId?: string;
}

export type ConversionResult =
  | {
      valid: true;
      opportunityData: {
        opportunity_name: string;
        lead_id: string;
        account_id: string | null;
        contact_id: string | null;
        division_id: string | null;
        estimated_revenue: number | null;
        source_channel: string | null;
        stage: 'intake';
      };
    }
  | {
      valid: false;
      reason: string;
    };

/**
 * Validate whether a lead can be converted to an opportunity
 * and produce the opportunity data if valid.
 */
export function validateConversion(input: ConversionInput): ConversionResult {
  const { lead, existingOpportunityForLead, accountId, contactId } = input;

  if (lead.stage !== 'won') {
    return {
      valid: false,
      reason: `Lead must be in 'won' stage to convert. Current stage: '${lead.stage}'`,
    };
  }

  if (existingOpportunityForLead) {
    return {
      valid: false,
      reason: 'Lead has already been converted to an opportunity',
    };
  }

  return {
    valid: true,
    opportunityData: {
      opportunity_name: lead.lead_name,
      lead_id: lead.id,
      account_id: accountId ?? null,
      contact_id: contactId ?? null,
      division_id: lead.division_id,
      estimated_revenue: lead.estimated_value,
      source_channel: lead.source_channel,
      stage: 'intake',
    },
  };
}
