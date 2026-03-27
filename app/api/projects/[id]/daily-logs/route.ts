import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createUserClientSafe } from '@/lib/supabase/server';
import { dailyLogCreateSchema } from '@/lib/validators/projects';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('project_daily_logs')
    .select(
      'id, project_id, log_date, work_summary, crew_count, delays, safety_notes, is_offline_origin, sync_client_id, submitted_at, submitted_by, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('log_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: dailyLogCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('project_daily_logs')
      .insert({ ...body, project_id: id, submitted_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

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
  },
);
