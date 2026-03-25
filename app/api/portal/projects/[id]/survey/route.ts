import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
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
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { data, error } = await supabase
    .from('portal_satisfaction_surveys')
    .select(
      'id, overall_rating, communication_rating, quality_rating, schedule_rating, comments, would_recommend, submitted_at',
    )
    .eq('project_id', projectId)
    .eq('portal_account_id', access.portalAccountId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ survey: data });
}

/**
 * POST /api/portal/projects/[id]/survey
 * Submits or updates a satisfaction survey for this portal account + project.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 10, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = surveySubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { data, error } = await supabase
    .from('portal_satisfaction_surveys')
    .upsert(
      {
        project_id: projectId,
        portal_account_id: access.portalAccountId,
        ...parsed.data,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,portal_account_id' },
    )
    .select(
      'id, overall_rating, communication_rating, quality_rating, schedule_rating, comments, would_recommend, submitted_at',
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
