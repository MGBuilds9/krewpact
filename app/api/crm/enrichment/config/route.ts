import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const DEFAULT_CONFIG = {
  sources: [
    { name: 'apollo', enabled: true, order: 1 },
    { name: 'clearbit', enabled: false, order: 2 },
    { name: 'linkedin', enabled: false, order: 3 },
    { name: 'google', enabled: false, order: 4 },
  ],
};

const configSchema = z.object({
  sources: z
    .array(
      z.object({
        name: z.string().min(1),
        enabled: z.boolean(),
        order: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const GET = withApiRoute({}, async () => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('crm_settings')
    .select('value')
    .eq('key', 'enrichment_config')
    .maybeSingle();

  if (error) throw dbError(error.message);

  if (!data) return NextResponse.json(DEFAULT_CONFIG);

  return NextResponse.json(data.value ?? DEFAULT_CONFIG);
});

export const PATCH = withApiRoute(
  { bodySchema: configSchema, rateLimit: { limit: 30, window: '1 m' } },
  async ({ body }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('crm_settings')
      .upsert(
        { key: 'enrichment_config', value: body, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      )
      .select('value')
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data.value);
  },
);
