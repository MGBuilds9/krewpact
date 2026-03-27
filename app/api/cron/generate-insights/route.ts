import { NextResponse } from 'next/server';

import { generateInsights } from '@/lib/ai/agents/insight-engine';
import { createCronLogger } from '@/lib/api/cron-logger';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

export const GET = withApiRoute({ auth: 'cron' }, async () => {
  if (process.env.AI_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'AI features are not enabled', disabled: true },
      { status: 503 },
    );
  }

  const cronLog = createCronLogger('generate-insights');
  const supabase = createServiceClient();

  // Get all active organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id')
    .limit(50);

  if (orgsError) {
    logger.error('Failed to fetch organizations for insight generation', {
      error: orgsError.message,
    });
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ success: true, message: 'No organizations found' });
  }

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const org of orgs) {
    try {
      const result = await generateInsights(org.id);
      totalGenerated += result.generated;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    } catch (err) {
      totalErrors++;
      logger.error(`Insight generation failed for org ${org.id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Insight generation complete', { totalGenerated, totalSkipped, totalErrors });

  const result = {
    success: true,
    generated: totalGenerated,
    skipped: totalSkipped,
    errors: totalErrors,
    orgs_processed: orgs.length,
    timestamp: new Date().toISOString(),
  };
  await cronLog.success({ generated: totalGenerated, skipped: totalSkipped, errors: totalErrors });
  return NextResponse.json(result);
});
