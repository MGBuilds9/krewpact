import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { dailyLogCreateSchema } from '@/lib/validators/projects';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { logger } from '@/lib/logger';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('project_daily_logs')
    .select(
      'id, project_id, log_date, work_summary, crew_count, delays, safety_notes, is_offline_origin, sync_client_id, submitted_at, submitted_by, created_at, updated_at' /* excluded from list: weather */,
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('log_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = dailyLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('project_daily_logs')
    .insert({ ...parsed.data, project_id: id, submitted_by: userId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: notify PM that a daily log was submitted
  try {
    const [projectResult, authorResult] = await Promise.all([
      supabase.from('projects').select('project_name, created_by').eq('id', id).single(),
      supabase.from('users').select('first_name, last_name').eq('clerk_user_id', userId).single(),
    ]);

    if (projectResult.data?.created_by) {
      const { data: pmUser } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', projectResult.data.created_by)
        .single();

      if (pmUser) {
        const authorName = authorResult.data
          ? `${authorResult.data.first_name} ${authorResult.data.last_name}`.trim()
          : 'A team member';

        dispatchNotification({
          type: 'daily_log_submitted',
          pm_email: pmUser.email,
          pm_name: `${pmUser.first_name} ${pmUser.last_name}`.trim(),
          supervisor_name: authorName,
          project_name: projectResult.data.project_name,
          log_date: data.log_date,
          log_id: data.id,
        }).catch((err) =>
          logger.error('Daily log notification failed', {
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
  } catch {
    // Notification lookup failed — don't break the response
  }

  return NextResponse.json(data, { status: 201 });
}
