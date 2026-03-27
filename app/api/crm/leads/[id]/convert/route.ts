import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { validateConversion } from '@/lib/crm/lead-conversion';
import { createUserClientSafe } from '@/lib/supabase/server';

const convertBodySchema = z.object({
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  opportunity_name: z.string().min(1).max(255).optional(),
});

const LEAD_SELECT =
  'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at';

export const POST = withApiRoute({ bodySchema: convertBodySchema }, async ({ params, body }) => {
  const { id } = params;
  const parsed = body as z.infer<typeof convertBodySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .single();

  if (leadError)
    throw leadError.code === 'PGRST116' ? notFound('Lead') : dbError(leadError.message);

  const { data: existingOpps } = await supabase
    .from('opportunities')
    .select('id')
    .eq('lead_id', id)
    .limit(1);

  const existingOpportunityForLead = (existingOpps?.length ?? 0) > 0;

  const result = validateConversion({
    lead: {
      id: lead.id as string,
      stage: lead.status as string,
      lead_name: lead.company_name as string,
      division_id: lead.division_id as string | null,
      estimated_value: null,
      company_name: lead.company_name as string | null,
      email: null,
      phone: null,
      source_channel: (lead.source_channel as string | null) ?? null,
    },
    existingOpportunityForLead,
    accountId: parsed.account_id,
    contactId: parsed.contact_id,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const opportunityData = {
    ...result.opportunityData,
    ...(parsed.opportunity_name ? { opportunity_name: parsed.opportunity_name } : {}),
  };

  const { data: opportunity, error: insertError } = await supabase
    .from('opportunities')
    .insert(opportunityData)
    .select()
    .single();

  if (insertError) throw dbError(insertError.message);

  return NextResponse.json(opportunity, { status: 201 });
});
