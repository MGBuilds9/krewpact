import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { enrichLead, mergeEnrichmentData } from '@/lib/integrations/enrichment';

const BATCH_SIZE = 20;

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SIGNING_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, domain, enrichment_data')
    .is('enrichment_data', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No leads to enrich' });
  }

  let processed = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const results = await enrichLead(lead.id, lead.domain);
      const enrichmentData = mergeEnrichmentData(
        lead.enrichment_data as Record<string, unknown> | null,
        results,
      );

      const { error: updateError } = await supabase
        .from('leads')
        .update({ enrichment_data: enrichmentData })
        .eq('id', lead.id);

      if (updateError) {
        errors++;
        console.error(`Enrichment update error for ${lead.id}:`, updateError.message);
      } else {
        processed++;
      }
    } catch (err) {
      errors++;
      console.error(`Enrichment error for ${lead.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
  });
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
