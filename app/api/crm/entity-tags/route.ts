import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { entityTagSchema } from '@/lib/validators/crm';

const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

const getQuerySchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
});

const deleteQuerySchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema: getQuerySchema }, async ({ query }) => {
  const { entity_type, entity_id } = query as z.infer<typeof getQuerySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('entity_tags')
    .select('id, tag_id, entity_type, entity_id, tags(*)')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('id', { ascending: true });

  if (error) throw dbError(error.message);

  return NextResponse.json({ data: data ?? [] });
});

export const POST = withApiRoute({ bodySchema: entityTagSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('entity_tags')
    .insert(body as z.infer<typeof entityTagSchema>)
    .select('id, tag_id, entity_type, entity_id, tags(*)')
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiRoute({ querySchema: deleteQuerySchema }, async ({ query }) => {
  const { entity_type, entity_id, tag_id } = query as z.infer<typeof deleteQuerySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('entity_tags')
    .delete()
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .eq('tag_id', tag_id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
