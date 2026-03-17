import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrgIdFromAuth } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const stageSchema = z.object({
  stage: z.string().min(1),
  maxHours: z.number().positive(),
});

const slaSettingsSchema = z.object({
  lead_stages: z.array(stageSchema).min(1),
  opportunity_stages: z.array(stageSchema).min(1),
});

const DEFAULT_SLA_SETTINGS = {
  lead_stages: [
    { stage: 'new', maxHours: 48 },
    { stage: 'contacted', maxHours: 72 },
    { stage: 'qualified', maxHours: 120 },
    { stage: 'estimating', maxHours: 168 },
    { stage: 'proposal_sent', maxHours: 336 },
  ],
  opportunity_stages: [
    { stage: 'intake', maxHours: 24 },
    { stage: 'site_visit', maxHours: 72 },
    { stage: 'estimating', maxHours: 168 },
    { stage: 'proposal', maxHours: 120 },
    { stage: 'negotiation', maxHours: 336 },
  ],
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const orgId = await getOrgIdFromAuth();
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('org_settings')
      .select('workflow')
      .eq('org_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slaConfig = data?.workflow?.sla_config ?? DEFAULT_SLA_SETTINGS;
    return NextResponse.json(slaConfig);
  } catch (err: unknown) {
    logger.error('Failed to fetch SLA settings', { error: err });
    return NextResponse.json({ error: 'Failed to fetch SLA settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const parsed = slaSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const orgId = await getOrgIdFromAuth();
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Read current workflow settings
    const { data: existing } = await supabase
      .from('org_settings')
      .select('workflow')
      .eq('org_id', orgId)
      .single();

    const currentWorkflow = existing?.workflow ?? {};
    const updatedWorkflow = { ...currentWorkflow, sla_config: parsed.data };

    const { data, error } = await supabase
      .from('org_settings')
      .upsert({ org_id: orgId, workflow: updatedWorkflow }, { onConflict: 'org_id' })
      .select('workflow')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.workflow?.sla_config ?? parsed.data);
  } catch (err: unknown) {
    logger.error('Failed to update SLA settings', { error: err });
    return NextResponse.json({ error: 'Failed to update SLA settings' }, { status: 500 });
  }
}
