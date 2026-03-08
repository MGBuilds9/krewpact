import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

/**
 * GET /api/portal/trade/compliance
 * Returns the trade partner's compliance documents and expiry summary.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const supabase = await createUserClient();

  // Resolve portal account — must be actor_type = 'trade_partner'
  const { data: pa, error: paError } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();

  if (paError || !pa)
    return NextResponse.json({ error: 'Portal account not found' }, { status: 403 });
  if (pa.actor_type !== 'trade_partner')
    return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });
  if (pa.status !== 'active')
    return NextResponse.json({ error: 'Portal account inactive' }, { status: 403 });

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

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

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
}
