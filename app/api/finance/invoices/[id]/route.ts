import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { invoiceSnapshotSchema } from '@/lib/validators/finance';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

export const GET = withApiRoute({ roles: FINANCE_ROLES }, async ({ params }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('invoice_snapshots')
    .select(
      'id, project_id, invoice_number, customer_name, invoice_date, due_date, status, subtotal_amount, tax_amount, total_amount, amount_paid, payment_link_url, erp_docname, snapshot_payload, created_at, updated_at',
    )
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: invoiceSnapshotSchema.partial(), roles: FINANCE_ROLES },
  async ({ params, body }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('invoice_snapshots')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  },
);
