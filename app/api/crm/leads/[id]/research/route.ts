import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { deepResearchLead } from '@/lib/integrations/deep-research';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(_req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch lead with enrichment data
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, company_name, domain, enrichment_data, enrichment_status')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  if (lead.enrichment_status !== 'complete') {
    return NextResponse.json(
      { error: 'Lead must be enriched before deep research' },
      { status: 400 },
    );
  }

  const enrichmentData = (lead.enrichment_data ?? {}) as Record<string, unknown>;
  const brave = enrichmentData.brave as Record<string, unknown> | undefined;
  const website = (brave?.website as string) ?? (lead.domain as string | null);

  try {
    const result = await deepResearchLead(lead.company_name ?? '', website, enrichmentData);

    // Store deep research in enrichment_data
    const updatedEnrichment = {
      ...enrichmentData,
      deep_research: result,
    };

    const { error: updateError } = await supabase
      .from('leads')
      .update({ enrichment_data: JSON.parse(JSON.stringify(updatedEnrichment)) })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, research: result });
  } catch (err) {
    logger.error(`Deep research error for ${id}`, { error: err });
    return NextResponse.json({ error: 'Deep research failed' }, { status: 500 });
  }
}
