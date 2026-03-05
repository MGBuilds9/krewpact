import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rfqPackageUpdateSchema } from '@/lib/validators/procurement';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rfqId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId, rfqId } = await params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('rfq_packages')
    .select('*')
    .eq('id', rfqId)
    .eq('project_id', projectId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rfqId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId, rfqId } = await params;
  const body = await req.json();
  const parsed = rfqPackageUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('rfq_packages')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', rfqId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
