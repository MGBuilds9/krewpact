import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { submittalReviewSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { subId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('submittal_reviews')
    .select('id, submittal_id, reviewer_user_id, outcome, review_notes, reviewed_at', {
      count: 'exact',
    })
    .eq('submittal_id', subId)
    .order('reviewed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: submittalReviewSchema },
  async ({ params, body, userId }) => {
    const { id, subId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('submittal_reviews')
      .insert({
        ...body,
        submittal_id: subId,
        reviewer_user_id: userId,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw dbError(error.message);

    // Sync status back to submittal
    await supabase
      .from('submittals')
      .update({ status: body.outcome })
      .eq('id', subId)
      .eq('project_id', id);

    return NextResponse.json(data, { status: 201 });
  },
);
