import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { opportunityUpdateSchema } from '@/lib/validators/crm';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at, opportunity_stage_history(*)',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Opportunity');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: opportunityUpdateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const update = body as z.infer<typeof opportunityUpdateSchema>;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // If stage is being changed, record history
    if (update.stage) {
      const { data: current, error: fetchError } = await supabase
        .from('opportunities')
        .select('stage')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') throw notFound('Opportunity');
        throw dbError(fetchError.message);
      }

      const currentStage = (current as Record<string, unknown>)?.stage as string;

      if (currentStage && currentStage !== update.stage) {
        await supabase.from('opportunity_stage_history').insert({
          opportunity_id: id,
          from_stage: currentStage,
          to_stage: update.stage,
          changed_by: userId,
        });
      }
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Opportunity');
      throw dbError(error.message);
    }

    queue
      .enqueue(JobType.ERPSyncOpportunity, {
        entityId: data.id,
        userId,
        meta: { operation: 'update' },
      })
      .catch((err) => {
        logger.error('Failed to enqueue ERPNext opportunity update sync', {
          opportunityId: data.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params, userId }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) throw dbError(error.message);

  queue
    .enqueue(JobType.ERPSyncOpportunity, {
      entityId: id,
      userId,
      meta: { operation: 'delete' },
    })
    .catch((err) => {
      logger.error('Failed to enqueue ERPNext opportunity delete sync', {
        opportunityId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return NextResponse.json({ success: true });
});
