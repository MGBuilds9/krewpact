import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { resolveDivisionId, routeToDivision } from '@/lib/crm/division-router';
import { assignLead } from '@/lib/crm/lead-assignment';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// Schema for incoming lead data
const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  companyName: z.string().optional(), // Fallback to name if generic
  message: z.string().optional(),
  projectType: z.string().optional(), // Mapped from 'service'
  role: z.string().optional(), // Mapped from 'position'
  source: z.string().default('website_inbound'),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

type LeadData = z.infer<typeof leadSchema>;
type SupabaseAdminClient = ReturnType<typeof createServiceClient>;

async function resolveOwner(
  supabase: SupabaseAdminClient,
  divisionId: string | null,
  source: string,
): Promise<string | null> {
  try {
    const assignment = await assignLead(supabase, {
      division_id: divisionId,
      source_channel: source,
    });
    return assignment.assigned ? assignment.assigned_to : null;
  } catch (e) {
    logger.error('Auto-assign on web lead failed:', { error: e });
    return null;
  }
}

async function insertLeadAndContact(
  supabase: SupabaseAdminClient,
  data: LeadData,
): Promise<NextResponse> {
  const company = data.companyName || `${data.name}'s Company`;

  const divisionCode = routeToDivision({
    project_type: data.projectType,
    project_description: data.message,
    company_name: company,
  });
  const divisionId = await resolveDivisionId(supabase, divisionCode);
  const ownerId = await resolveOwner(supabase, divisionId, data.source);

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      company_name: company,
      source_channel: data.source,
      status: 'new',
      project_description: data.message,
      project_type: data.projectType,
      division_id: divisionId,
      assigned_to: ownerId,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
    })
    .select('id')
    .single();

  if (leadError) {
    logger.error('Lead Insert Error:', { error: leadError });
    return NextResponse.json(
      { error: 'Failed to create lead', details: leadError.message },
      { status: 500 },
    );
  }

  const nameParts = data.name.trim().split(' ');
  const { error: contactError } = await supabase.from('contacts').insert({
    lead_id: lead.id,
    full_name: data.name,
    first_name: nameParts[0],
    last_name: nameParts.slice(1).join(' ') || '',
    email: data.email,
    phone: data.phone,
    title: data.role,
    is_primary: true,
  });

  if (contactError) {
    logger.error('Contact Insert Error:', { error: contactError });
  }

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    message: 'Lead captured successfully',
  });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, window: '1 m' });
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const signature = req.headers.get('x-webhook-secret');
    const secret = process.env.WEBHOOK_SIGNING_SECRET;
    if (!secret || signature !== secret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing secret' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const result = leadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation Failed', details: result.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    return await insertLeadAndContact(supabase, result.data);
  } catch (err: unknown) {
    logger.error('API Error:', { error: err });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
