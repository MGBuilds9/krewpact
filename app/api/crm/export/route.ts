import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const ALLOWED_ENTITIES = ['leads', 'contacts', 'accounts', 'opportunities'] as const;
type EntityType = (typeof ALLOWED_ENTITIES)[number];

export const GET = withApiRoute({}, async ({ req }) => {
  const url = new URL(req.url);
  const entity = url.searchParams.get('entity') as EntityType | null;

  if (!entity || !ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json(
      { error: `entity must be one of: ${ALLOWED_ENTITIES.join(', ')}` },
      { status: 400 },
    );
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from(entity).select('*').limit(5000);

  if (error) throw dbError(error.message);

  if (!data || data.length === 0) {
    return new NextResponse('', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${entity}-export.csv"`,
      },
    });
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          // Escape CSV values that contain commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(','),
    ),
  ];

  return new NextResponse(csvRows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${entity}-export.csv"`,
    },
  });
});
