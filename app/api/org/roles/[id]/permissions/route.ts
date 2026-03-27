import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rolePermissionEditorSchema } from '@/lib/validators/org';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error, count } = await supabase
    .from('role_permissions')
    .select('*, permissions(*)', { count: 'exact' })
    .eq('role_id', id)
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset), {
    headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' },
  });
});

const permissionBodySchema = z.record(z.string(), z.unknown());

export const POST = withApiRoute({ bodySchema: permissionBodySchema }, async ({ params, body }) => {
  const { id } = params;
  const parsed = rolePermissionEditorSchema.safeParse({
    ...(body as Record<string, unknown>),
    role_id: id,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('role_permissions')
    .upsert(parsed.data, { onConflict: 'role_id,permission_id' })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
