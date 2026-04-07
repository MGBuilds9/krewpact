import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { type LeadStage, validateTransition } from '@/lib/crm/lead-stages';
import { exportToCSV } from '@/lib/csv/exporter';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { leadStages } from '@/lib/validators/crm-leads';

const bulkSchema = z.object({
  action: z.enum(['assign', 'stage', 'delete', 'export']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  value: z.string().optional(),
});

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function handleBulkAssign(
  supabase: SupabaseClient,
  ids: string[],
  value: string | undefined,
): Promise<NextResponse> {
  if (!value)
    return NextResponse.json({ error: 'value is required for assign action' }, { status: 400 });
  const { error } = await supabase.from('leads').update({ assigned_to: value }).in('id', ids);
  if (error) {
    logger.error('Bulk lead assign failed', { error: error.message });
    throw dbError(error.message);
  }
  return NextResponse.json({ data: { updated: ids.length } });
}

async function handleBulkStage(
  supabase: SupabaseClient,
  ids: string[],
  value: string | undefined,
  userId: string | null,
): Promise<NextResponse> {
  if (!value)
    return NextResponse.json({ error: 'value is required for stage action' }, { status: 400 });
  if (!leadStages.includes(value as LeadStage))
    return NextResponse.json({ error: `Invalid stage: ${value}` }, { status: 400 });

  const newStage = value as LeadStage;

  const { data: current, error: fetchError } = await supabase
    .from('leads')
    .select('id, status')
    .in('id', ids);
  if (fetchError) {
    logger.error('Bulk stage fetch failed', { error: fetchError.message });
    throw dbError(fetchError.message);
  }

  const validIds: string[] = [];
  for (const lead of current ?? []) {
    const result = validateTransition(lead.status as LeadStage, newStage);
    if (result.valid) {
      validIds.push(lead.id);
    } else {
      logger.warn('Bulk stage transition skipped', { leadId: lead.id, reason: result.reason });
    }
  }

  if (validIds.length === 0)
    return NextResponse.json({ data: { updated: 0, skipped: ids.length } });

  const [updateResult, historyResult] = await Promise.all([
    supabase.from('leads').update({ status: newStage }).in('id', validIds),
    supabase.from('lead_stage_history').insert(
      validIds.map((id) => ({
        lead_id: id,
        from_stage: (current ?? []).find((l) => l.id === id)?.status ?? null,
        to_stage: newStage,
        changed_by: userId,
      })),
    ),
  ]);

  if (updateResult.error) {
    logger.error('Bulk stage update failed', { error: updateResult.error.message });
    throw dbError(updateResult.error.message);
  }
  if (historyResult.error) {
    logger.error('Bulk stage history insert failed', { error: historyResult.error.message });
  }

  return NextResponse.json({
    data: { updated: validIds.length, skipped: ids.length - validIds.length },
  });
}

async function handleBulkDelete(supabase: SupabaseClient, ids: string[]): Promise<NextResponse> {
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (error) {
    logger.error('Bulk lead soft-delete failed', { error: error.message });
    throw dbError(error.message);
  }
  return NextResponse.json({ data: { deleted: ids.length } });
}

async function handleBulkExport(supabase: SupabaseClient, ids: string[]): Promise<NextResponse> {
  const { data, error } = await supabase
    .from('leads')
    .select('company_name, email, phone, status, source_channel, created_at')
    .in('id', ids);
  if (error) {
    logger.error('Bulk lead export failed', { error: error.message });
    throw dbError(error.message);
  }
  const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    source: row.source_channel,
  }));
  const csv = exportToCSV(mapped, [
    'company_name',
    'email',
    'phone',
    'status',
    'source',
    'created_at',
  ]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="leads-export.csv"',
    },
  });
}

export const POST = withApiRoute({ bodySchema: bulkSchema }, async ({ body, userId }) => {
  const { action, ids, value } = body as z.infer<typeof bulkSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const handlers: Record<string, () => Promise<NextResponse>> = {
    assign: () => handleBulkAssign(supabase, ids, value),
    stage: () => handleBulkStage(supabase, ids, value, userId),
    delete: () => handleBulkDelete(supabase, ids),
    export: () => handleBulkExport(supabase, ids),
  };

  return handlers[action]();
});
