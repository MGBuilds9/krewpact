import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { exportToCSV } from '@/lib/csv/exporter';
import { logger } from '@/lib/logger';

const bulkSchema = z.object({
  action: z.enum(['assign', 'stage', 'delete', 'export']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  value: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, ids, value } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  switch (action) {
    case 'assign': {
      if (!value) {
        return NextResponse.json({ error: 'value is required for assign action' }, { status: 400 });
      }
      const { error } = await supabase.from('leads').update({ assigned_to: value }).in('id', ids);
      if (error) {
        logger.error('Bulk lead assign failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: { updated: ids.length } });
    }

    case 'stage': {
      if (!value) {
        return NextResponse.json({ error: 'value is required for stage action' }, { status: 400 });
      }
      const { error } = await supabase.from('leads').update({ status: value }).in('id', ids);
      if (error) {
        logger.error('Bulk lead stage update failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: { updated: ids.length } });
    }

    case 'delete': {
      const { error } = await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) {
        logger.error('Bulk lead soft-delete failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: { deleted: ids.length } });
    }

    case 'export': {
      const { data, error } = await supabase
        .from('leads')
        .select('company_name, email, phone, status, source_channel, created_at')
        .in('id', ids);
      if (error) {
        logger.error('Bulk lead export failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const columns = [
        'company_name',
        'email',
        'phone',
        'status',
        'source',
        'created_at',
      ];
      // Map source_channel → source for export column name
      const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        source: row.source_channel,
      }));
      const csv = exportToCSV(mapped, columns);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="leads-export.csv"',
        },
      });
    }
  }
}
