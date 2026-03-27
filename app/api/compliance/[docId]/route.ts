import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { complianceDocUpdateSchema } from '@/lib/validators/procurement';

export const GET = withApiRoute({}, async ({ params }) => {
  const { docId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('trade_partner_compliance_docs')
    .select(
      'id, portal_account_id, compliance_type, file_id, doc_number, issued_on, expires_on, status, verified_by, verified_at, created_at, updated_at',
    )
    .eq('id', docId)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: complianceDocUpdateSchema },
  async ({ params, body, userId }) => {
    const { docId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    if ((body as { status?: string }).status === 'valid') {
      updateData.verified_by = userId;
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('trade_partner_compliance_docs')
      .update(updateData)
      .eq('id', docId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);
