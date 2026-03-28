import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const categoryEnum = z.enum(['outreach', 'follow_up', 'nurture', 'event', 'referral']);

const getQuerySchema = z.object({
  category: categoryEnum.optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: categoryEnum,
  subject: z.string().min(1).max(200),
  body_html: z.string().min(1),
  body_text: z.string().optional().nullable(),
  merge_fields: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  division_id: z.string().uuid().optional().nullable(),
});

export const GET = withApiRoute({ querySchema: getQuerySchema }, async ({ req, query: qp }) => {
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('email_templates')
    .select(
      'id, name, subject, body_html, body_text, category, variables, division_id, is_active, created_at, updated_at',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false });

  if (qp.category) {
    query = query.eq('category', qp.category);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: createSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('email_templates').insert(body).select().single();

  if (error) throw dbError(error.message);

  return NextResponse.json({ data }, { status: 201 });
});
