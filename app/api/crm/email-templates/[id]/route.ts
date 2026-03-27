import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(['outreach', 'follow_up', 'nurture', 'event', 'referral']).optional(),
  subject: z.string().min(1).max(200).optional(),
  body_html: z.string().min(1).optional(),
  body_text: z.string().optional().nullable(),
  merge_fields: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('email_templates')
    .select(
      'id, name, subject, body_html, body_text, category, variables, division_id, is_active, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) throw notFound('Email template');

  return NextResponse.json({ data });
});

export const PATCH = withApiRoute({ bodySchema: updateSchema }, async ({ params, body }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('email_templates')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json({ data });
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('email_templates').delete().eq('id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
