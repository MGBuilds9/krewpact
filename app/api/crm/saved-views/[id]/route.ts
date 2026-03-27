import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const savedViewUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort_by: z.string().optional().nullable(),
  sort_dir: z.enum(['asc', 'desc']).optional().nullable(),
  columns: z.array(z.string()).optional().nullable(),
  is_default: z.boolean().optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('crm_saved_views')
    .select(
      'id, name, entity_type, filters, sort_by, sort_dir, columns, is_default, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: savedViewUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const parsed = body as z.infer<typeof savedViewUpdateSchema>;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // If setting as default, unset others first
    if (parsed.is_default) {
      const { data: existing } = await supabase
        .from('crm_saved_views')
        .select('entity_type')
        .eq('id', id)
        .single();

      if (existing) {
        await supabase
          .from('crm_saved_views')
          .update({ is_default: false })
          .eq('entity_type', existing.entity_type)
          .neq('id', id);
      }
    }

    const { data, error } = await supabase
      .from('crm_saved_views')
      .update(parsed)
      .eq('id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('crm_saved_views').delete().eq('id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
