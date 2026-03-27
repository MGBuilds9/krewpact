import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
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

  // Fetch compliance docs from file_metadata tagged as compliance for this portal account
  const {
    data: complianceDocs,
    error: docError,
    count,
  } = await supabase
    .from('file_metadata')
    .select('id, original_filename, mime_type, file_size_bytes, tags, created_at, updated_at', {
      count: 'exact',
    })
    .contains('tags', ['compliance'])
    .eq('source_identifier', pa.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (docError) throw dbError(docError.message);

  // Derive expiry from tags array entry formatted as "expiry:<ISO date>"
  const now = new Date();
  const docs = (complianceDocs ?? []).map((d) => {
    const tags = d.tags ?? [];
    const expiryTag = tags.find((t: string) => t.startsWith('expiry:'));
    const expiryDate = expiryTag ? new Date(expiryTag.replace('expiry:', '')) : null;
    const daysUntilExpiry =
      expiryDate && !isNaN(expiryDate.getTime())
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
