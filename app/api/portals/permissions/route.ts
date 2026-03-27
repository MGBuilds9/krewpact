import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { portalPermissionSchema } from '@/lib/validators/portals';

const querySchema = z.object({
  portal_account_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const {
    portal_account_id,
    project_id,
    limit = 50,
    offset = 0,
  } = query as z.infer<typeof querySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let q = supabase
    .from('portal_permissions')
    .select('id, portal_account_id, project_id, permission_set, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (portal_account_id) q = q.eq('portal_account_id', portal_account_id);
  if (project_id) q = q.eq('project_id', project_id);

  const { data, error, count } = await q;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute({ bodySchema: portalPermissionSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('portal_permissions')
    .upsert(body, { onConflict: 'portal_account_id,project_id' })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
