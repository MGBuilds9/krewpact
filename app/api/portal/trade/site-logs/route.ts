import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

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
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createUserClient();
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

/**
 * POST /api/portal/trade/site-logs
 * Creates a new field daily log from the trade portal.
 * Defence: duplicate detection (same project_id + log_date per portal_account).
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = siteLogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  // Verify permission on this project
  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', parsed.data.project_id)
    .single();

  if (!perm) return NextResponse.json({ error: 'No access to this project' }, { status: 403 });

  // Duplicate detection: one log per (portal_account + project + log_date)
  const { data: existing } = await supabase
    .from('project_daily_logs')
    .select('id')
    .eq('project_id', parsed.data.project_id)
    .eq('log_date', parsed.data.log_date)
    .contains('metadata', { trade_portal_id: pa.id })
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `A site log already exists for ${parsed.data.log_date} from your account` },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from('project_daily_logs')
    .insert({
      project_id: parsed.data.project_id,
      log_date: parsed.data.log_date,
      work_summary: parsed.data.work_summary,
      crew_count: parsed.data.crew_count,
      weather: parsed.data.weather ?? {},
      safety_notes: parsed.data.safety_notes ?? null,
      delays: parsed.data.delays ?? null,
      submitted_by: null, // Referenced from portal, not internal user
      submitted_at: new Date().toISOString(),
      is_offline_origin: false,
      metadata: { trade_portal_id: pa.id, source: 'trade_portal' },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
