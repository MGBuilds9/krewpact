import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
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

export const GET = withApiRoute({}, async (): Promise<NextResponse> => {
  const orgId = await getOrgIdFromAuth();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('org_settings')
    .select('workflow')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw dbError(error.message);

  const slaConfig = data?.workflow?.sla_config ?? DEFAULT_SLA_SETTINGS;
  return NextResponse.json(slaConfig);
});

export const PATCH = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' }, bodySchema: slaSettingsSchema },
  async ({ body }): Promise<NextResponse> => {
    const parsed = body as z.infer<typeof slaSettingsSchema>;
    const orgId = await getOrgIdFromAuth();
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: existing } = await supabase
      .from('org_settings')
      .select('workflow')
      .eq('org_id', orgId)
      .single();

    const currentWorkflow = existing?.workflow ?? {};
    const updatedWorkflow = { ...currentWorkflow, sla_config: parsed };

    const { data, error } = await supabase
      .from('org_settings')
      .upsert({ org_id: orgId, workflow: updatedWorkflow }, { onConflict: 'org_id' })
      .select('workflow')
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data?.workflow?.sla_config ?? parsed);
  },
);
