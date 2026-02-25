import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { validateConversion } from '@/lib/crm/lead-conversion';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    .select('*')
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
      stage: lead.stage as string,
      lead_name: lead.lead_name as string,
      division_id: lead.division_id as string | null,
      estimated_value: lead.estimated_value as number | null,
      company_name: lead.company_name as string | null,
      email: lead.email as string | null,
      phone: lead.phone as string | null,
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
    ...(parsed.data.opportunity_name
      ? { opportunity_name: parsed.data.opportunity_name }
      : {}),
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
