import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const sequenceDefaultsSchema = z.object({
  max_enrollments_per_day: z.number().int().positive().max(500),
  send_window_start: z.string().regex(timeRegex, 'Must be HH:MM format'),
  send_window_end: z.string().regex(timeRegex, 'Must be HH:MM format'),
  throttle_per_hour: z.number().int().positive().max(200),
  auto_unenroll_on_reply: z.boolean(),
});

const DEFAULT_SEQUENCE_DEFAULTS = {
  max_enrollments_per_day: 50,
  send_window_start: '09:00',
  send_window_end: '17:00',
  throttle_per_hour: 20,
  auto_unenroll_on_reply: true,
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
    const supabase = await createUserClient();

    const { data, error } = await supabase
      .from('org_settings')
      .select('workflow')
      .eq('org_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sequenceDefaults = data?.workflow?.sequence_defaults ?? DEFAULT_SEQUENCE_DEFAULTS;
    return NextResponse.json(sequenceDefaults);
  } catch (err: unknown) {
    logger.error('Failed to fetch sequence defaults', { error: err });
    return NextResponse.json({ error: 'Failed to fetch sequence defaults' }, { status: 500 });
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
    const parsed = sequenceDefaultsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const orgId = await getOrgIdFromAuth();
    const supabase = await createUserClient();

    // Read current workflow settings
    const { data: existing } = await supabase
      .from('org_settings')
      .select('workflow')
      .eq('org_id', orgId)
      .single();

    const currentWorkflow = existing?.workflow ?? {};
    const updatedWorkflow = { ...currentWorkflow, sequence_defaults: parsed.data };

    const { data, error } = await supabase
      .from('org_settings')
      .upsert({ org_id: orgId, workflow: updatedWorkflow }, { onConflict: 'org_id' })
      .select('workflow')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.workflow?.sequence_defaults ?? parsed.data);
  } catch (err: unknown) {
    logger.error('Failed to update sequence defaults', { error: err });
    return NextResponse.json({ error: 'Failed to update sequence defaults' }, { status: 500 });
  }
}
