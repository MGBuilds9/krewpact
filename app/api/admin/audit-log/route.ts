import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

const ALLOWED_ROLES = ['platform_admin', 'executive'];

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role gating: platform_admin + executive only
  const roles = (sessionClaims as Record<string, unknown>)?.krewpact_roles;
  const userRoles = Array.isArray(roles) ? roles : [];
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
  const entityType = url.searchParams.get('entity_type');
  const actionFilter = url.searchParams.get('action');
  const userIdFilter = url.searchParams.get('user_id');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');

  const supabase = await createUserClient();

  // Build query with explicit columns
  let query = supabase
    .from('audit_log')
    .select('id, user_id, action, entity_type, entity_id, entity_name, details, created_at', {
      count: 'exact',
    });

  // Apply filters
  if (entityType) {
    query = query.eq('entity_type', entityType);
  }
  if (actionFilter) {
    query = query.eq('action', actionFilter);
  }
  if (userIdFilter) {
    query = query.eq('user_id', userIdFilter);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  // Order and paginate
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    // If the table doesn't exist, return empty results instead of erroring
    if (
      error.message?.includes('does not exist') ||
      error.code === '42P01' ||
      error.message?.includes('relation')
    ) {
      logger.warn('audit_log table not found, returning empty results', {
        error: error.message,
      });
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        pageSize,
      });
    }

    logger.error('Failed to query audit_log', { error: error.message });
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
