/**
 * Shared CRM source channel categorization.
 * Used by: LeadForm dropdown, source metrics chart, auto-enrollment logic.
 */

export const INBOUND_SOURCES = [
  'website',
  'website_inbound',
  'referral',
  'repeat_client',
  'inbound',
] as const;

export const OUTBOUND_SOURCES = [
  'apollo',
  'cold_outreach',
  'door_knocking',
  'networking',
  'outreach',
  'linkedin',
] as const;

export type SourceCategory = 'inbound' | 'outbound' | 'other';

export function getSourceCategory(source: string | null): SourceCategory {
  if (!source) return 'other';
  if ((INBOUND_SOURCES as readonly string[]).includes(source)) return 'inbound';
  if ((OUTBOUND_SOURCES as readonly string[]).includes(source)) return 'outbound';
  return 'other';
}

/** All sources available in the LeadForm dropdown, organized by type. */
export const SOURCE_CHANNELS = [
  // Inbound
  'website',
  'referral',
  'repeat_client',
  'inbound',
  // Outbound
  'apollo',
  'cold_outreach',
  'door_knocking',
  'networking',
  'outreach',
  'linkedin',
  // Other
  'trade_show',
  'bid_board',
  'other',
] as const;
