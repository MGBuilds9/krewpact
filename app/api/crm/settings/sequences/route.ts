import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || 'e076c9b9-72ce-4fdc-a031-e5808e73d92c';

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

export const GET = withApiRoute({}, async (): Promise<NextResponse> => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('org_settings')
    .select('workflow')
    .eq('org_id', DEFAULT_ORG_ID)
    .single();

  if (error && error.code !== 'PGRST116') throw dbError(error.message);

  const sequenceDefaults = data?.workflow?.sequence_defaults ?? DEFAULT_SEQUENCE_DEFAULTS;
  return NextResponse.json(sequenceDefaults);
});

export const PATCH = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' }, bodySchema: sequenceDefaultsSchema },
  async ({ body }): Promise<NextResponse> => {
    const parsed = body as z.infer<typeof sequenceDefaultsSchema>;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: existing } = await supabase
      .from('org_settings')
      .select('workflow')
      .eq('org_id', DEFAULT_ORG_ID)
      .single();

    const currentWorkflow = existing?.workflow ?? {};
    const updatedWorkflow = { ...currentWorkflow, sequence_defaults: parsed };

    const { data, error } = await supabase
      .from('org_settings')
      .upsert({ org_id: DEFAULT_ORG_ID, workflow: updatedWorkflow }, { onConflict: 'org_id' })
      .select('workflow')
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data?.workflow?.sequence_defaults ?? parsed);
  },
);
