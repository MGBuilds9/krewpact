import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { exportToCSV } from '@/lib/csv/exporter';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

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
): Promise<NextResponse> {
  if (!value)
    return NextResponse.json({ error: 'value is required for stage action' }, { status: 400 });
  const { error } = await supabase.from('leads').update({ status: value }).in('id', ids);
  if (error) {
    logger.error('Bulk lead stage update failed', { error: error.message });
    throw dbError(error.message);
  }
  return NextResponse.json({ data: { updated: ids.length } });
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

export const POST = withApiRoute({ bodySchema: bulkSchema }, async ({ body }) => {
  const { action, ids, value } = body as z.infer<typeof bulkSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const handlers: Record<string, () => Promise<NextResponse>> = {
    assign: () => handleBulkAssign(supabase, ids, value),
    stage: () => handleBulkStage(supabase, ids, value),
    delete: () => handleBulkDelete(supabase, ids),
    export: () => handleBulkExport(supabase, ids),
  };

  return handlers[action]();
});
