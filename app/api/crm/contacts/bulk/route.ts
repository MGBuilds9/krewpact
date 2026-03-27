import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { exportToCSV } from '@/lib/csv/exporter';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const bulkSchema = z.object({
  action: z.enum(['assign', 'delete', 'export']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  value: z.string().optional(),
});

export const POST = withApiRoute({ bodySchema: bulkSchema }, async ({ body }) => {
  const { action, ids, value } = body as z.infer<typeof bulkSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  switch (action) {
    case 'assign': {
      if (!value) {
        return NextResponse.json({ error: 'value is required for assign action' }, { status: 400 });
      }
      const { error } = await supabase
        .from('contacts')
        .update({ assigned_to: value })
        .in('id', ids);
      if (error) {
        logger.error('Bulk contact assign failed', { error: error.message });
        throw dbError(error.message);
      }
      return NextResponse.json({ data: { updated: ids.length } });
    }

    case 'delete': {
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) {
        logger.error('Bulk contact soft-delete failed', { error: error.message });
        throw dbError(error.message);
      }
      return NextResponse.json({ data: { deleted: ids.length } });
    }

    case 'export': {
      const { data, error } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, phone, title, created_at')
        .in('id', ids);
      if (error) {
        logger.error('Bulk contact export failed', { error: error.message });
        throw dbError(error.message);
      }
      const columns = ['first_name', 'last_name', 'email', 'phone', 'title', 'created_at'];
      const csv = exportToCSV((data ?? []) as Record<string, unknown>[], columns);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="contacts-export.csv"',
        },
      });
    }
  }
});
