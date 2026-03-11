import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  UNAUTHORIZED,
  INVALID_JSON,
  validationError,
  dbError,
  errorResponse,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

const savedViewCreateSchema = z.object({
  name: z.string().min(1).max(100),
  entity_type: z.enum(entityTypes),
  filters: z.record(z.string(), z.unknown()),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
  columns: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

const querySchema = z.object({
  entity_type: z.enum(entityTypes).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  let query = supabase
    .from('crm_saved_views')
    .select(
      'id, name, entity_type, filters, sort_by, sort_dir, columns, is_default, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (parsed.data.entity_type) {
    query = query.eq('entity_type', parsed.data.entity_type);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = savedViewCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // If is_default, unset other defaults for same entity_type
  if (parsed.data.is_default) {
    await supabase
      .from('crm_saved_views')
      .update({ is_default: false })
      .eq('entity_type', parsed.data.entity_type);
  }

  const { data, error } = await supabase
    .from('crm_saved_views')
    .insert(parsed.data)
    .select()
    .single();

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json(data, { status: 201 });
}
