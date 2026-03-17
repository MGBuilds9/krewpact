import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const CreateICPSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  division_id: z.string().uuid().optional().nullable(),
  industry_match: z.array(z.string()).default([]),
  geography_match: z
    .object({ cities: z.array(z.string()), provinces: z.array(z.string()) })
    .optional()
    .nullable(),
  project_value_range: z.object({ min: z.number(), max: z.number() }).optional().nullable(),
  project_types: z.array(z.string()).default([]),
  repeat_rate_weight: z.number().min(0).max(1).default(0),
  top_sources: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

/**
 * GET /api/crm/icp
 * List all ICPs. Filterable by division_id and is_active.
 * Paginated via limit/offset.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const divisionId = searchParams.get('division_id');
  const isActiveParam = searchParams.get('is_active');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  try {
    let query = supabase
      .from('ideal_client_profiles')
      .select(
        'id, division_id, name, description, is_auto_generated, is_active, industry_match, geography_match, project_value_range, project_types, company_size_range, repeat_rate_weight, sample_size, confidence_score, avg_deal_value, avg_project_duration_days, top_sources, metadata, created_at, updated_at',
        { count: 'exact' },
      )
      .order('confidence_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (divisionId) {
      query = query.eq('division_id', divisionId);
    }

    if (isActiveParam !== null) {
      query = query.eq('is_active', isActiveParam === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('ICP list query failed', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      hasMore: offset + limit < (count ?? 0),
    });
  } catch (err) {
    logger.error('GET /api/crm/icp error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/icp
 * Create a manual (non-auto-generated) ICP.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateICPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase
      .from('ideal_client_profiles')
      .insert({
        ...parsed.data,
        is_auto_generated: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('ICP create failed', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error('POST /api/crm/icp error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
