import type { SupabaseClient } from '@supabase/supabase-js';

export interface MatchResult {
  leads: { id: string; lead_name: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
  accounts: { id: string; account_name: string }[];
}

/**
 * Matches an email address to CRM entities (leads, contacts, and their accounts).
 * Used by auto-log to create activity records for matching entities.
 */
export async function matchEmailToEntities(
  supabase: SupabaseClient,
  emailAddress: string,
): Promise<MatchResult> {
  const normalizedEmail = emailAddress.toLowerCase().trim();

  // Query leads and contacts in parallel
  const [leadsResult, contactsResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, lead_name')
      .eq('email', normalizedEmail),
    supabase
      .from('contacts')
      .select('id, first_name, last_name, account_id')
      .eq('email', normalizedEmail),
  ]);

  const leads = (leadsResult.data ?? []).map((l) => ({
    id: l.id as string,
    lead_name: l.lead_name as string,
  }));

  const contactsRaw = contactsResult.data ?? [];
  const contacts = contactsRaw.map((c) => ({
    id: c.id as string,
    first_name: c.first_name as string,
    last_name: c.last_name as string,
  }));

  // Gather unique account IDs from matched contacts
  const accountIds = [
    ...new Set(
      contactsRaw
        .map((c) => c.account_id as string | null)
        .filter((id): id is string => id !== null),
    ),
  ];

  let accounts: { id: string; account_name: string }[] = [];
  if (accountIds.length > 0) {
    const accountsResult = await supabase
      .from('accounts')
      .select('id, account_name')
      .in('id', accountIds);

    accounts = (accountsResult.data ?? []).map((a) => ({
      id: a.id as string,
      account_name: a.account_name as string,
    }));
  }

  return { leads, contacts, accounts };
}
