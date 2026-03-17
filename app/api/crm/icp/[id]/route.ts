import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

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
export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const { data, error } = await supabase
      .from('ideal_client_profiles')
      .select(
        'id, division_id, name, description, is_auto_generated, is_active, industry_match, geography_match, project_value_range, project_types, company_size_range, repeat_rate_weight, sample_size, confidence_score, avg_deal_value, avg_project_duration_days, top_sources, metadata, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
  } catch (err) {
    logger.error('GET /api/crm/icp/[id] error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/crm/icp/[id]
 * Update an ICP (toggle active, edit params, etc.)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchICPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase
      .from('ideal_client_profiles')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
  } catch (err) {
    logger.error('PATCH /api/crm/icp/[id] error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/icp/[id]
 * Delete an ICP.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const { error } = await supabase.from('ideal_client_profiles').delete().eq('id', id);

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('DELETE /api/crm/icp/[id] error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
