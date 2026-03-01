import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { enrichLead, mergeEnrichmentData } from '@/lib/integrations/enrichment';
import { summarizeEnrichment } from '@/lib/integrations/enrichment-summarizer';

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

  // Fetch leads that need enrichment (pending or null status)
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, domain, enrichment_data, enrichment_status, company_name, city, province')
    .or('enrichment_status.is.null,enrichment_status.eq.pending')
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
      // Mark as in_progress
      await supabase
        .from('leads')
        .update({ enrichment_status: 'in_progress' })
        .eq('id', lead.id);

      // Fetch primary contact for this lead (for Apollo Match)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('first_name, last_name, linkedin_url')
        .eq('lead_id', lead.id)
        .eq('is_primary', true)
        .limit(1);

      const primaryContact = contacts?.[0] ?? null;

      // Run waterfall enrichment
      const { results, sideEffects } = await enrichLead(
        {
          id: lead.id,
          company_name: lead.company_name ?? '',
          domain: lead.domain as string | null,
          city: lead.city as string | null,
          province: lead.province as string | null,
        },
        primaryContact,
      );

      // Merge enrichment data
      const enrichmentData = mergeEnrichmentData(
        lead.enrichment_data as Record<string, unknown> | null,
        results,
      );

      // Generate AI summary from enrichment data (non-critical)
      if (results.some((r) => r.success)) {
        try {
          const summary = await summarizeEnrichment(
            lead.company_name ?? '',
            enrichmentData as Record<string, unknown>,
          );
          if (summary) {
            (enrichmentData as Record<string, unknown>).ai_summary = summary;
          }
        } catch (summaryErr) {
          console.error(`AI summary error for ${lead.id}:`, summaryErr);
          // Non-critical — enrichment still succeeds without summary
        }
      }

      // Build update payload
      const updatePayload: Record<string, unknown> = {
        enrichment_data: enrichmentData,
        enrichment_status: results.some((r) => r.success) ? 'complete' : 'failed',
      };

      // Apply side effects: update domain if Apollo Match or Brave found one
      if (sideEffects.domain) {
        updatePayload.domain = sideEffects.domain;
      }

      // Apply side effects: update city if Google Maps found one
      if (sideEffects.city) {
        updatePayload.city = sideEffects.city;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id);

      if (updateError) {
        errors++;
        console.error(`Enrichment update error for ${lead.id}:`, updateError.message);
        continue;
      }

      // Upsert contact data from Apollo Match (if we got email/phone)
      if (primaryContact && (sideEffects.contactEmail || sideEffects.contactPhone)) {
        const contactUpdate: Record<string, unknown> = {};
        if (sideEffects.contactEmail) contactUpdate.email = sideEffects.contactEmail;
        if (sideEffects.contactPhone) contactUpdate.phone = sideEffects.contactPhone;
        if (sideEffects.contactTitle) contactUpdate.title = sideEffects.contactTitle;
        if (sideEffects.contactLinkedinUrl) contactUpdate.linkedin_url = sideEffects.contactLinkedinUrl;

        await supabase
          .from('contacts')
          .update(contactUpdate)
          .eq('lead_id', lead.id)
          .eq('is_primary', true);
      }

      processed++;
    } catch (err) {
      errors++;
      console.error(`Enrichment error for ${lead.id}:`, err);

      // Mark as failed
      await supabase
        .from('leads')
        .update({ enrichment_status: 'failed' })
        .eq('id', lead.id);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    total: leads.length,
    timestamp: new Date().toISOString(),
  });
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
