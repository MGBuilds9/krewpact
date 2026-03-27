import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError,forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

const siteLogSchema = z.object({
  project_id: z.string().uuid(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  work_summary: z.string().min(10).max(3000),
  crew_count: z.number().int().min(0).max(999),
  weather: z.object({ temp: z.number().optional(), condition: z.string().optional() }).optional(),
  safety_notes: z.string().max(1000).optional(),
  delays: z.string().max(1000).optional(),
});

async function resolveActiveTradePartner(
  userId: string,
  supabase: Awaited<ReturnType<typeof createUserClient>>,
) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();
  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') return null;
  return pa;
}

/**
 * GET /api/portal/trade/site-logs
 * Returns site logs submitted by this trade partner.
 */
export const GET = withApiRoute({}, async ({ req, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

  const projectId = req.nextUrl.searchParams.get('project_id');

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  let query = supabase
    .from('project_daily_logs')
    .select(
      'id, project_id, log_date, work_summary, crew_count, weather, safety_notes, delays, submitted_at, created_at',
      { count: 'exact' },
    )
    .contains('metadata', { trade_portal_id: pa.id })
    .order('log_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId) query = query.eq('project_id', projectId);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

/**
 * POST /api/portal/trade/site-logs
 * Creates a new field daily log from the trade portal.
 * Defence: duplicate detection (same project_id + log_date per portal_account).
 */
export const POST = withApiRoute({ bodySchema: siteLogSchema }, async ({ userId, body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

  // Verify permission on this project
  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', body.project_id)
    .single();

  if (!perm) throw forbidden('No access to this project');

  // Duplicate detection: one log per (portal_account + project + log_date)
  const { data: existing } = await supabase
    .from('project_daily_logs')
    .select('id')
    .eq('project_id', body.project_id)
    .eq('log_date', body.log_date)
    .contains('metadata', { trade_portal_id: pa.id })
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `A site log already exists for ${body.log_date} from your account` },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from('project_daily_logs')
    .insert({
      project_id: body.project_id,
      log_date: body.log_date,
      work_summary: body.work_summary,
      crew_count: body.crew_count,
      weather: body.weather ?? {},
      safety_notes: body.safety_notes ?? null,
      delays: body.delays ?? null,
      submitted_by: null, // Referenced from portal, not internal user
      submitted_at: new Date().toISOString(),
      is_offline_origin: false,
      metadata: { trade_portal_id: pa.id, source: 'trade_portal' },
    })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
