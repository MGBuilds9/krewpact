import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { generateICPsFromAccounts } from '@/lib/crm/icp-engine';
import type { AccountForICP } from '@/lib/crm/icp-engine';

/**
 * POST /api/crm/icp/generate
 *
 * Trigger ICP generation from existing accounts.
 * Steps:
 * 1. Fetch all accounts with total_projects >= 1
 * 2. Run generateICPsFromAccounts algorithm
 * 3. Delete existing auto-generated ICPs
 * 4. Insert new ICPs
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 5, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    // Fetch all accounts with at least one project
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(
        'id, division_id, industry, address, total_projects, lifetime_revenue, is_repeat_client, source, tags',
      )
      .gte('total_projects', 1)
      .is('deleted_at', null);

    if (accountsError) {
      logger.error('ICP generate: accounts fetch failed', { error: accountsError.message });
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    const accountsForICP: AccountForICP[] = (accounts ?? []).map((a) => ({
      id: a.id,
      division_id: a.division_id ?? null,
      industry: a.industry ?? null,
      address: (a.address as Record<string, string> | null) ?? null,
      total_projects: a.total_projects ?? 0,
      lifetime_revenue: a.lifetime_revenue ?? 0,
      is_repeat_client: a.is_repeat_client ?? false,
      source: a.source ?? null,
      tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
    }));

    // Run ICP generation algorithm
    const profiles = generateICPsFromAccounts(accountsForICP);

    if (profiles.length === 0) {
      return NextResponse.json({
        message: 'No ICPs generated. Need at least 3 accounts per industry.',
        generated: 0,
        deleted: 0,
      });
    }

    // Delete existing auto-generated ICPs
    const { error: deleteError, count: deletedCount } = await supabase
      .from('ideal_client_profiles')
      .delete({ count: 'exact' })
      .eq('is_auto_generated', true);

    if (deleteError) {
      logger.error('ICP generate: delete existing failed', { error: deleteError.message });
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new ICPs
    const { data: inserted, error: insertError } = await supabase
      .from('ideal_client_profiles')
      .insert(
        profiles.map((p) => ({
          name: p.name,
          description: p.description,
          division_id: p.division_id,
          is_auto_generated: true,
          is_active: true,
          industry_match: p.industry_match,
          geography_match: p.geography_match,
          project_value_range: p.project_value_range,
          project_types: p.project_types,
          repeat_rate_weight: p.repeat_rate_weight,
          sample_size: p.sample_size,
          confidence_score: p.confidence_score,
          avg_deal_value: p.avg_deal_value,
          avg_project_duration_days: p.avg_project_duration_days,
          top_sources: p.top_sources,
        })),
      )
      .select('id, name, confidence_score, sample_size');

    if (insertError) {
      logger.error('ICP generate: insert failed', { error: insertError.message });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    logger.info(`ICP generation complete: ${profiles.length} generated, ${deletedCount ?? 0} replaced`);

    return NextResponse.json({
      message: `Generated ${profiles.length} ICP(s) from ${accountsForICP.length} accounts.`,
      generated: profiles.length,
      deleted: deletedCount ?? 0,
      icps: inserted ?? [],
    });
  } catch (err) {
    logger.error('POST /api/crm/icp/generate error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
