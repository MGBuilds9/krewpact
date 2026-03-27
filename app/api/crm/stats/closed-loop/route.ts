import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function calcIcpAccuracy(supabase: SupabaseClient, monthStart: string): Promise<number> {
  const { data: wonWithLeads, error: wonLeadsErr } = await supabase
    .from('opportunities')
    .select('lead_id')
    .eq('stage', 'contracted')
    .gte('updated_at', monthStart)
    .not('lead_id', 'is', null);

  if (wonLeadsErr || !wonWithLeads || wonWithLeads.length === 0) return 0;

  const leadIds = wonWithLeads
    .map((r) => (r as Record<string, unknown>).lead_id as string)
    .filter(Boolean);
  const { data: matched, error: matchErr } = await supabase
    .from('icp_lead_matches')
    .select('lead_id')
    .in('lead_id', leadIds)
    .gte('match_score', 50);

  if (matchErr || !matched) return 0;
  const matchedSet = new Set(matched.map((r) => (r as Record<string, unknown>).lead_id as string));
  return Math.round((matchedSet.size / leadIds.length) * 100);
}

export const GET = withApiRoute({}, async (): Promise<NextResponse> => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Start of current month (UTC)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  // 1. Won deals this month — opportunities with stage='contracted' updated this month
  const { count: wonCount, error: wonErr } = await supabase
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('stage', 'contracted')
    .gte('updated_at', monthStart);

  if (wonErr) throw dbError(wonErr.message);

  // 2. Accounts created from wins this month (source='conversion')
  const { count: accountsFromWins, error: accErr } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'conversion')
    .gte('created_at', monthStart)
    .is('deleted_at', null);

  if (accErr) throw dbError(accErr.message);

  // 3. Active ICP profiles
  const { count: activeICPs, error: icpErr } = await supabase
    .from('ideal_client_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (icpErr) throw dbError(icpErr.message);

  // 4. ICP accuracy: of won deals this month with a lead_id,
  //    what % had an icp_lead_matches row with match_score >= 50?
  const icpAccuracyPct = await calcIcpAccuracy(supabase, monthStart);

  return NextResponse.json({
    won_deals_this_month: wonCount ?? 0,
    accounts_from_wins: accountsFromWins ?? 0,
    active_icps: activeICPs ?? 0,
    icp_accuracy_pct: icpAccuracyPct,
  });
});
