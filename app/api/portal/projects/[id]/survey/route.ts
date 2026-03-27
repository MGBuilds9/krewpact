import { NextResponse } from 'next/server';

import { dbError,forbidden } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';
import { surveySubmissionSchema } from '@/lib/validators/portal-survey';

async function resolvePortalAccess(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  userId: string,
  projectId: string,
) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.status !== 'active') return null;

  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', projectId)
    .single();

  if (!perm) return null;

  return { portalAccountId: pa.id };
}

/**
 * GET /api/portal/projects/[id]/survey
 * Returns the existing survey response for this portal account + project, if any.
 */
export const GET = withApiRoute({}, async ({ userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

  const { data, error } = await supabase
    .from('portal_satisfaction_surveys')
    .select(
      'id, overall_rating, communication_rating, quality_rating, schedule_rating, comments, would_recommend, submitted_at',
    )
    .eq('project_id', projectId)
    .eq('portal_account_id', access.portalAccountId)
    .maybeSingle();

  if (error) throw dbError(error.message);

  return NextResponse.json({ survey: data });
});

/**
 * POST /api/portal/projects/[id]/survey
 * Submits or updates a satisfaction survey for this portal account + project.
 */
export const POST = withApiRoute(
  { rateLimit: { limit: 10, window: '1 m' }, bodySchema: surveySubmissionSchema },
  async ({ userId, params, body }) => {
    const projectId = params.id;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const access = await resolvePortalAccess(supabase, userId, projectId);
    if (!access) throw forbidden('Access denied');

    const { data, error } = await supabase
      .from('portal_satisfaction_surveys')
      .upsert(
        {
          project_id: projectId,
          portal_account_id: access.portalAccountId,
          ...body,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,portal_account_id' },
      )
      .select(
        'id, overall_rating, communication_rating, quality_rating, schedule_rating, comments, would_recommend, submitted_at',
      )
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
