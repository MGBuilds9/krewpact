import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/crm/settings/suppression
 * Returns leads with high-confidence account matches (score >= 0.8),
 * indicating they were suppressed from outreach sequences.
 */
export const GET = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' } },
  async (): Promise<NextResponse> => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('lead_account_matches')
      .select(
        `lead_id, match_type, match_score, created_at,
       lead:leads(company_name),
       account:accounts(account_name)`,
      )
      .gte('match_score', 0.8)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw dbError('Failed to fetch suppression log');

    const entries = (data ?? []).map((row) => {
      const lead = row.lead as unknown as { company_name: string } | null;
      const account = row.account as unknown as { account_name: string } | null;
      return {
        lead_id: row.lead_id,
        company_name: lead?.company_name ?? 'Unknown',
        account_name: account?.account_name ?? 'Unknown',
        match_type: row.match_type,
        match_score: row.match_score,
        created_at: row.created_at,
      };
    });

    return NextResponse.json(entries);
  },
);
