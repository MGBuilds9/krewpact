import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { submittalReviewSchema } from '@/lib/validators/field-ops';

type RouteContext = { params: Promise<{ id: string; subId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subId } = await context.params;
  const supabase = await createUserClient();

  const { data, error, count } = await supabase
    .from('submittal_reviews')
    .select('*', { count: 'exact' })
    .eq('submittal_id', subId)
    .order('reviewed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data: data ?? [], total, hasMore: false });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, subId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = submittalReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('submittal_reviews')
    .insert({
      ...parsed.data,
      submittal_id: subId,
      reviewer_user_id: userId,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync status back to submittal
  await supabase
    .from('submittals')
    .update({ status: parsed.data.outcome })
    .eq('id', subId)
    .eq('project_id', id);

  return NextResponse.json(data, { status: 201 });
}
