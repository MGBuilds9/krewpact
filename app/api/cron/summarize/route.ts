import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { summarizeEnrichment } from '@/lib/integrations/enrichment-summarizer';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 15; // Process 15 per call (Gemini rate limit)
const FETCH_LIMIT = 200; // Fetch enough to find all pending leads

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('summarize');
  const supabase = createServiceClient();

  // Fetch enriched leads missing AI summary
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, company_name, enrichment_data')
    .eq('enrichment_status', 'complete')
    .not('enrichment_data', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(FETCH_LIMIT);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No leads to summarize' });
  }

  // Filter to only leads without ai_summary in enrichment_data
  const needsSummary = leads.filter((lead) => {
    const data = lead.enrichment_data as Record<string, unknown> | null;
    return data && !data.ai_summary;
  });

  if (needsSummary.length === 0) {
    return NextResponse.json({
      success: true,
      processed: 0,
      message: 'All fetched leads already have summaries',
    });
  }

  const batch = needsSummary.slice(0, BATCH_SIZE);
  let processed = 0;
  let errors = 0;

  for (const lead of batch) {
    try {
      const enrichmentData = lead.enrichment_data as Record<string, unknown>;
      const summary = await summarizeEnrichment(lead.company_name ?? '', enrichmentData);

      if (!summary) {
        continue; // No data to summarize
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          enrichment_data: { ...enrichmentData, ai_summary: summary },
        })
        .eq('id', lead.id);

      if (updateError) {
        errors++;
        logger.error(`Summary update error for ${lead.id}`, { error: updateError.message });
        continue;
      }

      processed++;
    } catch (err) {
      errors++;
      logger.error(`Summarization error for ${lead.id}`, { error: err });
    }
  }

  const result = {
    success: true,
    processed,
    errors,
    total: needsSummary.length,
    remaining: needsSummary.length - batch.length,
    timestamp: new Date().toISOString(),
  };
  await cronLog.success({ processed, errors, total: needsSummary.length });
  return NextResponse.json(result);
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
