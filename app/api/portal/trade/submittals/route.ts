import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

const submittalSchema = z.object({
  project_id: z.string().uuid(),
  submittal_type: z.enum(['shop_drawing', 'product_data', 'sample', 'rfi', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  file_ids: z.array(z.string().uuid()).optional(),
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
 * GET /api/portal/trade/submittals
 * Returns submittals submitted by this trade partner.
 */
export const GET = withApiRoute({}, async ({ req, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

  const projectId = req.nextUrl.searchParams.get('project_id');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  let query = supabase
    .from('submittals')
    .select(
      'id, project_id, submittal_type, title, description, status, revision_no, submitted_at, reviewed_at, reviewer_id, metadata, created_at',
      { count: 'exact' },
    )
    .contains('metadata', { trade_portal_id: pa.id })
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId) query = query.eq('project_id', projectId);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

/**
 * POST /api/portal/trade/submittals
 * Creates a new submittal. Submittal revisions are immutable once submitted.
 */
export const POST = withApiRoute({ bodySchema: submittalSchema }, async ({ userId, body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

  // Verify portal has permission on this project
  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', body.project_id)
    .single();

  if (!perm) throw forbidden('No access to this project');

  // Create the submittal
  const { data, error } = await supabase
    .from('submittals')
    .insert({
      project_id: body.project_id,
      submittal_type: body.submittal_type,
      title: body.title,
      description: body.description ?? null,
      status: 'submitted',
      revision_no: 1,
      submitted_at: new Date().toISOString(),
      metadata: {
        trade_portal_id: pa.id,
        file_ids: body.file_ids ?? [],
        source: 'trade_portal',
      },
    })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
