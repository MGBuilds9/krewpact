import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'posted']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  project_id: z.string().uuid().optional(),
  division_id: z.string().min(1).optional(),
  expense_date: z.string(),
  user_id: z.string().uuid(),
  tax_amount: z.number().nonnegative().optional(),
  currency_code: z.string().max(3).default('CAD'),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { project_id, status } = parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  let query = supabase
    .from('expense_claims')
    .select(
      'id, user_id, project_id, division_id, amount, tax_amount, currency_code, category, description, expense_date, status, submitted_at, posted_at, erp_document_id, erp_document_type, created_at, updated_at, user:users(first_name, last_name, avatar_url), project:projects(project_name)',
      { count: 'exact' },
    )
    .order('expense_date', { ascending: false });

  if (project_id) query = query.eq('project_id', project_id);
  if (status) query = query.eq('status', status);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('expense_claims')
    .insert({ ...parsed.data, status: 'draft' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
