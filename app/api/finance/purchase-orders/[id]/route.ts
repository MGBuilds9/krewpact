import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { poSnapshotSchema } from '@/lib/validators/finance';

export const GET = withApiRoute({}, async ({ params }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('po_snapshots')
    .select(
      'id, project_id, po_number, supplier_name, po_date, status, subtotal_amount, tax_amount, total_amount, erp_docname, snapshot_payload, created_at, updated_at',
    )
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: poSnapshotSchema.partial() },
  async ({ params, body }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('po_snapshots')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  },
);
