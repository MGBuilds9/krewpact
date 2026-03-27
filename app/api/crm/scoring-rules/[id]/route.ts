import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const scoringRuleUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['fit', 'intent', 'engagement']).optional(),
  field_name: z.string().min(1).optional(),
  operator: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  score_impact: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const PUT = withApiRoute(
  { bodySchema: scoringRuleUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('scoring_rules')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Scoring rule');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('scoring_rules').delete().eq('id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
