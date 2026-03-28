import { NextResponse } from 'next/server';

import { createCronLogger } from '@/lib/api/cron-logger';
import { withApiRoute } from '@/lib/api/with-api-route';
import { fetchMerxTenders, toBiddingOpportunity } from '@/lib/integrations/merx-client';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// eslint-disable-next-line max-lines-per-function
export const GET = withApiRoute({ auth: 'cron' }, async () => {
  const cronLog = createCronLogger('merx-sync');
  const supabase = createServiceClient();

  // Fetch all org IDs that need tender data
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id')
    .is('deleted_at', null);

  if (orgsError) {
    logger.error('MERX sync: failed to fetch orgs', { error: orgsError.message });
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }

  if (!orgs?.length) {
    return NextResponse.json({ success: true, message: 'No organizations found' });
  }

  // Fetch tenders from MERX once for all orgs
  let tenders;
  try {
    tenders = await fetchMerxTenders();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('MERX sync: fetch failed', { error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!tenders.length) {
    await cronLog.success({ fetched: 0, inserted: 0, skipped: 0 });
    return NextResponse.json({ success: true, fetched: 0, inserted: 0, skipped: 0 });
  }

  // Collect all existing dedup hashes in one query
  const { data: existing } = await supabase
    .from('bidding_opportunities')
    .select('dedup_hash')
    .eq('source', 'merx');

  const existingHashes = new Set((existing ?? []).map((r) => r.dedup_hash as string));

  let inserted = 0;
  let skipped = 0;
  const notifications: Array<{ user_id: string; title: string; body: string; category: string }> =
    [];

  for (const org of orgs) {
    const newOpportunities = tenders
      .map((t) => toBiddingOpportunity(t, org.id))
      .filter((opp) => !existingHashes.has(opp.dedup_hash));

    if (!newOpportunities.length) {
      skipped += tenders.length;
      continue;
    }

    const { error: insertError } = await supabase
      .from('bidding_opportunities')
      .upsert(newOpportunities, { onConflict: 'dedup_hash', ignoreDuplicates: true });

    if (insertError) {
      logger.error('MERX sync: insert failed', { org_id: org.id, error: insertError.message });
      skipped += newOpportunities.length;
      continue;
    }

    inserted += newOpportunities.length;
    skipped += tenders.length - newOpportunities.length;

    // Queue notifications for org users with bidding access
    const { data: biddingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', org.id)
      .contains('role_keys', ['estimator']);

    for (const user of biddingUsers ?? []) {
      notifications.push({
        user_id: user.id,
        title: `${newOpportunities.length} new MERX tender${newOpportunities.length > 1 ? 's' : ''}`,
        body: 'New public tenders matching Ontario construction have been imported.',
        category: 'bidding',
      });
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  const result = {
    success: true,
    fetched: tenders.length,
    inserted,
    skipped,
    notifications_sent: notifications.length,
    timestamp: new Date().toISOString(),
  };

  await cronLog.success({ fetched: tenders.length, inserted, skipped });
  return NextResponse.json(result);
});
