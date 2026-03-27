import { NextResponse } from 'next/server';

import { dbError,forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/portal/trade/compliance
 * Returns the trade partner's compliance documents and expiry summary.
 */
export const GET = withApiRoute({}, async ({ req, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Resolve portal account — must be actor_type = 'trade_partner'
  const { data: pa, error: paError } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();

  if (paError || !pa) throw forbidden('Portal account not found');
  if (pa.actor_type !== 'trade_partner') throw forbidden('Trade partner access only');
  if (pa.status !== 'active') throw forbidden('Portal account inactive');

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // Fetch compliance docs from portal_view_logs / file_metadata tagged as compliance
  const {
    data: complianceDocs,
    error: docError,
    count,
  } = await supabase
    .from('file_metadata')
    .select('id, file_name, file_type, file_size_bytes, meta, created_at, updated_at', {
      count: 'exact',
    })
    .contains('meta', { trade_portal_id: pa.id, doc_category: 'compliance' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (docError) throw dbError(docError.message);

  // Derive expiry from meta.expiry_date
  const now = new Date();
  const docs = (complianceDocs ?? []).map((d) => {
    const meta = (d.meta as Record<string, unknown>) ?? {};
    const expiryDate = meta.expiry_date ? new Date(meta.expiry_date as string) : null;
    const daysUntilExpiry = expiryDate
      ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      ...d,
      expiry_date: expiryDate?.toISOString() ?? null,
      days_until_expiry: daysUntilExpiry,
      status:
        daysUntilExpiry === null
          ? 'unknown'
          : daysUntilExpiry < 0
            ? 'expired'
            : daysUntilExpiry < 14
              ? 'expiring_soon'
              : 'valid',
    };
  });

  return NextResponse.json({
    ...paginatedResponse(docs, count, limit, offset),
    summary: {
      total_docs: docs.length,
      expired: docs.filter((d) => d.status === 'expired').length,
      expiring_soon: docs.filter((d) => d.status === 'expiring_soon').length,
      valid: docs.filter((d) => d.status === 'valid').length,
    },
  });
});
