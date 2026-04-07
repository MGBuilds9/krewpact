import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { deepResearchLead } from '@/lib/integrations/deep-research';
import { createServiceClient } from '@/lib/supabase/server';

export const POST = withApiRoute(
  { rateLimit: { limit: 5, window: '1 m' } },
  async ({ params, orgId }) => {
    const { id } = params;
    const supabase = createServiceClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, company_name, domain, enrichment_data, enrichment_status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !lead) throw notFound('Lead');

    if (lead.enrichment_status !== 'complete') {
      return NextResponse.json(
        { error: 'Lead must be enriched before deep research' },
        { status: 400 },
      );
    }

    const enrichmentData = (lead.enrichment_data ?? {}) as Record<string, unknown>;
    const brave = enrichmentData.brave as Record<string, unknown> | undefined;
    const website = (brave?.website as string) ?? (lead.domain as string | null);

    const result = await deepResearchLead(
      lead.company_name ?? '',
      website,
      enrichmentData,
      orgId ?? '',
    );

    const updatedEnrichment = { ...enrichmentData, deep_research: result };

    const { error: updateError } = await supabase
      .from('leads')
      .update({ enrichment_data: JSON.parse(JSON.stringify(updatedEnrichment)) })
      .eq('id', id);

    if (updateError) throw dbError(updateError.message);

    return NextResponse.json({ success: true, research: result });
  },
);
