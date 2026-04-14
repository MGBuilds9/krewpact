import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { opportunityCreateSchema } from '@/lib/validators/crm';

const opportunityStages = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
  'closed_won',
  'closed_lost',
] as const;

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  stage: z.enum(opportunityStages).optional(),
  owner_user_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  view: z.enum(['list', 'pipeline']).optional(),
});

type OppRow = Record<string, unknown>;

function buildPipelineView(data: OppRow[]) {
  const stageMap: Record<string, { opportunities: OppRow[]; total_value: number; count: number }> =
    {};
  for (const s of opportunityStages) {
    stageMap[s] = { opportunities: [], total_value: 0, count: 0 };
  }
  for (const opp of data) {
    const oppStage = opp.stage as string;
    const revenue = (opp.estimated_revenue as number) ?? 0;
    if (stageMap[oppStage]) {
      stageMap[oppStage].opportunities.push(opp);
      stageMap[oppStage].total_value += revenue;
      stageMap[oppStage].count += 1;
    }
  }
  return { stages: stageMap };
}

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { division_id, stage, owner_user_id, account_id, view } = query as z.infer<
    typeof querySchema
  >;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let dbQuery = supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (division_id) dbQuery = dbQuery.eq('division_id', division_id);
  if (stage) dbQuery = dbQuery.eq('stage', stage);
  if (owner_user_id) dbQuery = dbQuery.eq('owner_user_id', owner_user_id);
  if (account_id) dbQuery = dbQuery.eq('account_id', account_id);

  // Pipeline view returns ALL stages — no pagination. Previously this applied
  // range(offset, offset+limit-1) to BOTH list and pipeline views, which silently
  // capped kanban totals at the default page size and made the dashboard disagree
  // with the kanban for users with > limit opportunities. ISSUE-016.
  // RLS still scopes the result; the bound is the user's accessible row count.
  if (view !== 'pipeline') {
    dbQuery = dbQuery.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  if (view === 'pipeline') return NextResponse.json(buildPipelineView((data ?? []) as OppRow[]));

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: opportunityCreateSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const insertData = {
      ...(body as z.infer<typeof opportunityCreateSchema>),
      stage: (body as z.infer<typeof opportunityCreateSchema>).stage ?? 'intake',
    };
    const { data, error } = await supabase
      .from('opportunities')
      .insert(insertData)
      .select()
      .single();
    if (error) throw dbError(error.message);

    queue.enqueue(JobType.ERPSyncOpportunity, { entityId: data.id, userId }).catch((err) => {
      logger.error('Failed to enqueue ERPNext opportunity sync', {
        opportunityId: data.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return NextResponse.json(data, { status: 201 });
  },
);
