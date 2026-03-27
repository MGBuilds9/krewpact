import { NextResponse } from 'next/server';

import { createCronLogger } from '@/lib/api/cron-logger';
import { withApiRoute } from '@/lib/api/with-api-route';
import { enrichLead, mergeEnrichmentData } from '@/lib/integrations/enrichment';
import { summarizeEnrichment } from '@/lib/integrations/enrichment-summarizer';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

const BATCH_SIZE = 50;

type ServiceClient = ReturnType<typeof createServiceClient>;

interface EnrichSideEffects {
  domain?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactTitle?: string | null;
  contactLinkedinUrl?: string | null;
}

async function maybeUpdateContact(
  supabase: ServiceClient,
  leadId: string,
  primaryContact: unknown,
  sideEffects: EnrichSideEffects,
): Promise<void> {
  if (!primaryContact) return;
  if (!sideEffects.contactEmail && !sideEffects.contactPhone) return;
  const contactUpdate: Record<string, unknown> = {};
  if (sideEffects.contactEmail) contactUpdate.email = sideEffects.contactEmail;
  if (sideEffects.contactPhone) contactUpdate.phone = sideEffects.contactPhone;
  if (sideEffects.contactTitle) contactUpdate.title = sideEffects.contactTitle;
  if (sideEffects.contactLinkedinUrl) contactUpdate.linkedin_url = sideEffects.contactLinkedinUrl;
  await supabase
    .from('contacts')
    .update(contactUpdate)
    .eq('lead_id', leadId)
    .eq('is_primary', true);
}

async function processLead(
  supabase: ServiceClient,
  lead: Record<string, unknown>,
): Promise<'success' | 'error'> {
  try {
    await supabase
      .from('leads')
      .update({ enrichment_status: 'in_progress' })
      .eq('id', lead.id as string);

    const { data: contacts } = await supabase
      .from('contacts')
      .select('first_name, last_name, linkedin_url')
      .eq('lead_id', lead.id as string)
      .eq('is_primary', true)
      .limit(1);

    const primaryContact = contacts?.[0] ?? null;

    const { results, sideEffects } = await enrichLead(
      {
        id: lead.id as string,
        company_name: (lead.company_name as string) ?? '',
        domain: lead.domain as string | null,
        city: lead.city as string | null,
        province: lead.province as string | null,
      },
      primaryContact,
    );

    const enrichmentData = mergeEnrichmentData(
      lead.enrichment_data as Record<string, unknown> | null,
      results,
    );

    if (results.some((r) => r.success)) {
      try {
        const summary = await summarizeEnrichment(
          (lead.company_name as string) ?? '',
          enrichmentData as Record<string, unknown>,
        );
        Object.assign(
          enrichmentData as Record<string, unknown>,
          summary ? { ai_summary: summary } : {},
        );
      } catch (summaryErr) {
        logger.error(`AI summary error for ${lead.id}`, { error: summaryErr });
      }
    }

    const updatePayload: Record<string, unknown> = {
      enrichment_data: enrichmentData,
      enrichment_status: results.some((r) => r.success) ? 'complete' : 'failed',
    };
    if (sideEffects.domain) updatePayload.domain = sideEffects.domain;
    if (sideEffects.city) updatePayload.city = sideEffects.city;

    const { error: updateError } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead.id as string);

    if (updateError) {
      logger.error(`Enrichment update error for ${lead.id}`, { error: updateError.message });
      return 'error';
    }

    await maybeUpdateContact(
      supabase,
      lead.id as string,
      primaryContact,
      sideEffects as EnrichSideEffects,
    );
    return 'success';
  } catch (err) {
    logger.error(`Enrichment error for ${lead.id}`, { error: err });
    await supabase
      .from('leads')
      .update({ enrichment_status: 'failed' })
      .eq('id', lead.id as string);
    return 'error';
  }
}

export const GET = withApiRoute({ auth: 'cron' }, async () => {
  const cronLog = createCronLogger('enrichment');
  const supabase = createServiceClient();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, domain, enrichment_data, enrichment_status, company_name, city, province')
    .or('enrichment_status.is.null,enrichment_status.eq.pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No leads to enrich' });
  }

  let processed = 0;
  let errors = 0;

  for (const lead of leads) {
    const outcome = await processLead(supabase, lead as Record<string, unknown>);
    if (outcome === 'success') processed++;
    else errors++;
  }

  const result = {
    success: true,
    processed,
    errors,
    total: leads.length,
    timestamp: new Date().toISOString(),
  };
  await cronLog.success({ processed, errors, total: leads.length });
  return NextResponse.json(result);
});
