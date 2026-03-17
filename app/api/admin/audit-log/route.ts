import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const ALLOWED_ROLES = ['platform_admin', 'executive'];

interface AuditFilters {
  entityType: string | null;
  actionFilter: string | null;
  userIdFilter: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder type is complex and varies by .select() call
function applyAuditFilters(query: any, filters: AuditFilters) {
  let q = query;
  if (filters.entityType) q = q.eq('entity_type', filters.entityType);
  if (filters.actionFilter) q = q.eq('action', filters.actionFilter);
  if (filters.userIdFilter) q = q.eq('user_id', filters.userIdFilter);
  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo);
  return q;
}

function handleAuditError(
  error: { message?: string; code?: string },
  page: number,
  pageSize: number,
): NextResponse {
  const isTableMissing =
    error.message?.includes('does not exist') ||
    error.code === '42P01' ||
    error.message?.includes('relation');
  if (isTableMissing) {
    logger.warn('audit_log table not found, returning empty results', { error: error.message });
    return NextResponse.json({ data: [], total: 0, page, pageSize });
  }
  logger.error('Failed to query audit_log', { error: error.message });
  return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRoles = await getKrewpactRoles();
  const hasAccess = userRoles.some((r: unknown) => ALLOWED_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: platform_admin or executive role required' },
      { status: 403 },
    );
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10)),
  );

  const filters: AuditFilters = {
    entityType: url.searchParams.get('entity_type'),
    actionFilter: url.searchParams.get('action'),
    userIdFilter: url.searchParams.get('user_id'),
    dateFrom: url.searchParams.get('date_from'),
    dateTo: url.searchParams.get('date_to'),
  };

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const baseQuery = supabase
    .from('audit_log')
    .select('id, user_id, action, entity_type, entity_id, entity_name, details, created_at', {
      count: 'exact',
    });

  const from = (page - 1) * pageSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = applyAuditFilters(baseQuery as any, filters)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) return handleAuditError(error, page, pageSize);

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}
