import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const mergeSchema = z.object({
  primary_id: z.string().uuid(),
  secondary_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { primary_id, secondary_id } = parsed.data;

  if (primary_id === secondary_id) {
    return NextResponse.json({ error: 'Cannot merge an account with itself' }, { status: 400 });
  }

  const supabase = await createUserClient();

  const [primaryResult, secondaryResult] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', primary_id).single(),
    supabase.from('accounts').select('*').eq('id', secondary_id).single(),
  ]);

  if (primaryResult.error) {
    return NextResponse.json({ error: 'Primary account not found' }, { status: 404 });
  }
  if (secondaryResult.error) {
    return NextResponse.json({ error: 'Secondary account not found' }, { status: 404 });
  }

  const primary = primaryResult.data as Record<string, unknown>;
  const secondary = secondaryResult.data as Record<string, unknown>;

  // Fill empty fields on primary from secondary
  const updates: Record<string, unknown> = {};
  const mergedFields: string[] = [];
  const skipFields = ['id', 'created_at', 'updated_at', 'deleted_at'];

  for (const [key, val] of Object.entries(secondary)) {
    if (skipFields.includes(key)) continue;
    if ((primary[key] === null || primary[key] === '' || primary[key] === undefined) && val != null && val !== '') {
      updates[key] = val;
      mergedFields.push(key);
    }
  }

  // Reassign related entities
  const reassigned: string[] = [];

  const { error: contactErr } = await supabase
    .from('contacts')
    .update({ account_id: primary_id })
    .eq('account_id', secondary_id);
  if (!contactErr) reassigned.push('contacts');

  const { error: oppErr } = await supabase
    .from('opportunities')
    .update({ account_id: primary_id })
    .eq('account_id', secondary_id);
  if (!oppErr) reassigned.push('opportunities');

  const { error: actErr } = await supabase
    .from('activities')
    .update({ account_id: primary_id })
    .eq('account_id', secondary_id);
  if (!actErr) reassigned.push('activities');

  // Update primary
  if (Object.keys(updates).length > 0) {
    await supabase.from('accounts').update(updates).eq('id', primary_id);
  }

  // Soft-delete secondary
  await supabase
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', secondary_id);

  return NextResponse.json({
    primaryId: primary_id,
    secondaryId: secondary_id,
    mergedFields,
    reassignedRelations: reassigned,
  });
}
