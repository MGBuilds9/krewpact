import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const prefsSchema = z.object({
  email_opt_in: z.boolean().optional(),
  preferred_channel: z.enum(['email', 'phone', 'linkedin', 'text']).optional(),
  do_not_contact: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'never']).optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('contacts')
    .select('id, communication_prefs')
    .eq('id', id)
    .single();

  if (error) throw error.code === 'PGRST116' ? notFound('Contact') : dbError(error.message);

  const prefs = (data as Record<string, unknown>)?.communication_prefs ?? {};
  return NextResponse.json({ id, communication_prefs: prefs });
});

export const PATCH = withApiRoute({ bodySchema: prefsSchema }, async ({ params, body }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: current, error: fetchError } = await supabase
    .from('contacts')
    .select('id, communication_prefs')
    .eq('id', id)
    .single();

  if (fetchError)
    throw fetchError.code === 'PGRST116' ? notFound('Contact') : dbError(fetchError.message);

  const existingPrefs =
    ((current as Record<string, unknown>)?.communication_prefs as Record<string, unknown>) ?? {};
  const mergedPrefs = { ...existingPrefs, ...(body as z.infer<typeof prefsSchema>) };

  const { data, error } = await supabase
    .from('contacts')
    .update({ communication_prefs: mergedPrefs })
    .eq('id', id)
    .select('id, communication_prefs')
    .single();

  if (error) throw error.code === 'PGRST116' ? notFound('Contact') : dbError(error.message);

  return NextResponse.json(data);
});
