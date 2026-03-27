import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const versionCreateSchema = z.object({
  reason: z.string().optional(),
});

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('estimate_versions')
    /* excluded from list: snapshot */
    .select('id, estimate_id, revision_no, reason, created_by, created_at', { count: 'exact' })
    .eq('estimate_id', id)
    .order('revision_no', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw dbError(error.message);
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({}, async ({ req, params, userId }) => {
  const { id } = params;

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

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // 1) Fetch estimate with lines
  const { data: estimate, error: fetchError } = await supabase
    .from('estimates')
    .select(
      'id, estimate_number, status, subtotal_amount, tax_amount, total_amount, margin_pct, currency_code, revision_no, account_id, contact_id, opportunity_id, division_id, owner_user_id, approved_at, approved_by, metadata, created_at, updated_at, estimate_lines(id, estimate_id, line_type, description, quantity, unit, unit_cost, markup_pct, line_total, sort_order, is_optional, catalog_item_id, assembly_id, parent_line_id, metadata, created_at, updated_at)',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  // 2) Build snapshot
  const estimateRecord = estimate as Record<string, unknown>;
  const lines = Array.isArray(estimateRecord.estimate_lines) ? estimateRecord.estimate_lines : [];

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
    throw dbError(insertError.message);
  }

  // 4) Increment estimate revision_no
  await supabase
    .from('estimates')
    .update({ revision_no: currentRevision + 1 })
    .eq('id', id);

  return NextResponse.json(version, { status: 201 });
});
