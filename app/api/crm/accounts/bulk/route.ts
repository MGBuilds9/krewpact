import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { exportToCSV } from '@/lib/csv/exporter';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const bulkSchema = z.object({
  action: z.enum(['assign', 'delete', 'export', 'tag']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withApiRoute({ bodySchema: bulkSchema }, async ({ body }) => {
  const { action, ids, params } = body as z.infer<typeof bulkSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  switch (action) {
    case 'assign': {
      const assigneeId = params?.assignee_id;
      if (!assigneeId || typeof assigneeId !== 'string') {
        return NextResponse.json(
          { error: 'params.assignee_id is required for assign action' },
          { status: 400 },
        );
      }
      const { error } = await supabase
        .from('accounts')
        .update({ assigned_to: assigneeId })
        .in('id', ids);
      if (error) {
        logger.error('Bulk account assign failed', { error: error.message });
        throw dbError(error.message);
      }
      return NextResponse.json({ data: { updated: ids.length } });
    }

    case 'delete': {
      const { error } = await supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) {
        logger.error('Bulk account soft-delete failed', { error: error.message });
        throw dbError(error.message);
      }
      return NextResponse.json({ data: { deleted: ids.length } });
    }

    case 'export': {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_name, account_type, industry, website, phone, created_at')
        .in('id', ids);
      if (error) {
        logger.error('Bulk account export failed', { error: error.message });
        throw dbError(error.message);
      }
      const columns = ['account_name', 'account_type', 'industry', 'website', 'phone', 'created_at'];
      const csv = exportToCSV((data ?? []) as Record<string, unknown>[], columns);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="accounts-export.csv"',
        },
      });
    }

    case 'tag': {
      return NextResponse.json({ data: { tagged: ids.length } });
    }
  }
});
