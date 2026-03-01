import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const versionCreateSchema = z.object({
  reason: z.string().optional(),
});

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  const { data, error } = await supabase
    .from('estimate_versions')
    .select('*')
    .eq('estimate_id', id)
    .order('revision_no', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = versionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reason = parsed.data.reason || null;

  const supabase = await createUserClient();

  // 1) Fetch estimate with lines
  const { data: estimate, error: fetchError } = await supabase
    .from('estimates')
    .select('*, estimate_lines(*)')
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  // 2) Build snapshot
  const estimateRecord = estimate as Record<string, unknown>;
  const lines = Array.isArray(estimateRecord.estimate_lines)
    ? estimateRecord.estimate_lines
    : [];

  // Remove the nested lines from the estimate snapshot
  const estimateData = Object.fromEntries(
    Object.entries(estimateRecord).filter(([key]) => key !== 'estimate_lines'),
  );

  const snapshot = {
    estimate: estimateData,
    lines,
    created_at: new Date().toISOString(),
  };

  const currentRevision = Number(estimateRecord.revision_no) || 0;

  // 3) Insert version record
  const { data: version, error: insertError } = await supabase
    .from('estimate_versions')
    .insert({
      estimate_id: id,
      revision_no: currentRevision,
      snapshot,
      reason,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 4) Increment estimate revision_no
  await supabase
    .from('estimates')
    .update({ revision_no: currentRevision + 1 })
    .eq('id', id);

  return NextResponse.json(version, { status: 201 });
}
