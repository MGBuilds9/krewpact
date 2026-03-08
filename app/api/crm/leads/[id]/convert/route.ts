import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { validateConversion } from '@/lib/crm/lead-conversion';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

const convertBodySchema = z.object({
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  opportunity_name: z.string().min(1).max(255).optional(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = convertBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'id, company_name, status, substatus, lifecycle_stage, lead_score, fit_score, intent_score, engagement_score, source_channel, source_campaign, attribution_source, attribution_detail, assigned_to:owner_id, division_id, created_at, updated_at, city, province, address, postal_code, country, industry, company_size, revenue_range, next_followup_at, last_activity_at, last_contacted_at, is_qualified, in_sequence, sequence_paused, notes, tags, custom_fields, domain, enrichment_status, enrichment_data, deleted_at, stage_entered_at',
    )
    .eq('id', id)
    .single();

  if (leadError) {
    const status = leadError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: leadError.message }, { status });
  }

  // Check if opportunity already exists for this lead
  const { data: existingOpps } = await supabase
    .from('opportunities')
    .select('id')
    .eq('lead_id', id)
    .limit(1);

  const existingOpportunityForLead = (existingOpps?.length ?? 0) > 0;

  // Validate conversion
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
    accountId: parsed.data.account_id,
    contactId: parsed.data.contact_id,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Build opportunity data, allowing name override
  const opportunityData = {
    ...result.opportunityData,
    ...(parsed.data.opportunity_name ? { opportunity_name: parsed.data.opportunity_name } : {}),
  };

  // Insert opportunity
  const { data: opportunity, error: insertError } = await supabase
    .from('opportunities')
    .insert(opportunityData)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(opportunity, { status: 201 });
}
