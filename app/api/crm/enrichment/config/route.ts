import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { z } from 'zod';

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

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const { data, error } = await supabase
    .from('crm_settings')
    .select('value')
    .eq('key', 'enrichment_config')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(DEFAULT_CONFIG);
  }

  return NextResponse.json(data.value ?? DEFAULT_CONFIG);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const { data, error } = await supabase
    .from('crm_settings')
    .upsert(
      { key: 'enrichment_config', value: parsed.data, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    .select('value')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.value);
}
