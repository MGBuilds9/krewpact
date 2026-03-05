import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { opportunityCreateSchema } from '@/lib/validators/crm';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

const opportunityStages = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
  'closed_lost',
] as const;

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  stage: z.enum(opportunityStages).optional(),
  owner_user_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  view: z.enum(['list', 'pipeline']).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id, stage, owner_user_id, account_id, view } = parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const supabase = await createUserClient();

  let query = supabase.from('opportunities').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (stage) {
    query = query.eq('stage', stage);
  }

  if (owner_user_id) {
    query = query.eq('owner_user_id', owner_user_id);
  }

  if (account_id) {
    query = query.eq('account_id', account_id);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pipeline view: group opportunities by stage with counts and totals
  if (view === 'pipeline') {
    const stageMap: Record<
      string,
      { opportunities: typeof data; total_value: number; count: number }
    > = {};

    for (const s of opportunityStages) {
      stageMap[s] = { opportunities: [], total_value: 0, count: 0 };
    }

    for (const opp of data ?? []) {
      const oppStage = (opp as Record<string, unknown>).stage as string;
      const revenue = ((opp as Record<string, unknown>).estimated_revenue as number) ?? 0;
      if (stageMap[oppStage]) {
        stageMap[oppStage].opportunities.push(opp);
        stageMap[oppStage].total_value += revenue;
        stageMap[oppStage].count += 1;
      }
    }

    return NextResponse.json({ stages: stageMap });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = opportunityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = await getOrgIdFromAuth();
  const supabase = await createUserClient();
  const insertData = {
    ...parsed.data,
    stage: parsed.data.stage ?? 'intake',
    org_id: orgId,
  };

  const { data, error } = await supabase.from('opportunities').insert(insertData).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
