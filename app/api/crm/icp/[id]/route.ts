import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const PatchICPSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  division_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  industry_match: z.array(z.string()).optional(),
  geography_match: z
    .object({ cities: z.array(z.string()), provinces: z.array(z.string()) })
    .optional()
    .nullable(),
  project_value_range: z.object({ min: z.number(), max: z.number() }).optional().nullable(),
  project_types: z.array(z.string()).optional(),
  repeat_rate_weight: z.number().min(0).max(1).optional(),
  top_sources: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

/**
 * GET /api/crm/icp/[id]
 * Fetch a single ICP by ID.
 */
export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('ideal_client_profiles')
    .select(
      'id, division_id, name, description, is_auto_generated, is_active, industry_match, geography_match, project_value_range, project_types, company_size_range, repeat_rate_weight, sample_size, confidence_score, avg_deal_value, avg_project_duration_days, top_sources, metadata, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('ICP');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

/**
 * PATCH /api/crm/icp/[id]
 * Update an ICP (toggle active, edit params, etc.)
 */
export const PATCH = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' }, bodySchema: PatchICPSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('ideal_client_profiles')
      .update({ ...(body as z.infer<typeof PatchICPSchema>), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('ICP');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

/**
 * DELETE /api/crm/icp/[id]
 * Delete an ICP.
 */
export const DELETE = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' } },
  async ({ params }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { error } = await supabase.from('ideal_client_profiles').delete().eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') throw notFound('ICP');
      throw dbError(error.message);
    }

    return NextResponse.json({ success: true });
  },
);
