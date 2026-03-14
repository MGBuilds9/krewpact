import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Start of current month (UTC)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  try {
    // 1. Won deals this month — opportunities with stage='contracted' updated this month
    const { count: wonCount, error: wonErr } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('stage', 'contracted')
      .gte('updated_at', monthStart);

    if (wonErr) {
      logger.error('closed-loop stats: won_deals query failed', { error: wonErr.message });
      return NextResponse.json({ error: wonErr.message }, { status: 500 });
    }

    // 2. Accounts created from wins this month (source='conversion')
    const { count: accountsFromWins, error: accErr } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'conversion')
      .gte('created_at', monthStart)
      .is('deleted_at', null);

    if (accErr) {
      logger.error('closed-loop stats: accounts_from_wins query failed', { error: accErr.message });
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    // 3. Active ICP profiles
    const { count: activeICPs, error: icpErr } = await supabase
      .from('ideal_client_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (icpErr) {
      logger.error('closed-loop stats: active_icps query failed', { error: icpErr.message });
      return NextResponse.json({ error: icpErr.message }, { status: 500 });
    }

    // 4. ICP accuracy: of won deals this month with a lead_id,
    //    what % had an icp_lead_matches row with match_score >= 50?
    const { data: wonWithLeads, error: wonLeadsErr } = await supabase
      .from('opportunities')
      .select('lead_id')
      .eq('stage', 'contracted')
      .gte('updated_at', monthStart)
      .not('lead_id', 'is', null);

    if (wonLeadsErr) {
      logger.error('closed-loop stats: won_with_leads query failed', { error: wonLeadsErr.message });
      return NextResponse.json({ error: wonLeadsErr.message }, { status: 500 });
    }

    let icpAccuracyPct = 0;

    if (wonWithLeads && wonWithLeads.length > 0) {
      const leadIds = wonWithLeads
        .map((r) => (r as Record<string, unknown>).lead_id as string)
        .filter(Boolean);

      const { data: matchedLeads, error: matchErr } = await supabase
        .from('icp_lead_matches')
        .select('lead_id')
        .in('lead_id', leadIds)
        .gte('match_score', 50);

      if (matchErr) {
        logger.error('closed-loop stats: icp_lead_matches query failed', {
          error: matchErr.message,
        });
        // Non-fatal — return 0 accuracy
      } else if (matchedLeads) {
        // Deduplicate — a lead may match multiple ICPs, count it once
        const matchedSet = new Set(
          matchedLeads.map((r) => (r as Record<string, unknown>).lead_id as string),
        );
        icpAccuracyPct = Math.round((matchedSet.size / leadIds.length) * 100);
      }
    }

    return NextResponse.json({
      won_deals_this_month: wonCount ?? 0,
      accounts_from_wins: accountsFromWins ?? 0,
      active_icps: activeICPs ?? 0,
      icp_accuracy_pct: icpAccuracyPct,
    });
  } catch (err: unknown) {
    logger.error('closed-loop stats: unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
