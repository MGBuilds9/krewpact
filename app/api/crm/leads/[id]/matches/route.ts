import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const patchSchema = z.object({
  match_id: z.string().uuid(),
  is_confirmed: z.boolean(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('lead_account_matches')
    .select(
      `id, lead_id, account_id, match_type, match_score, is_confirmed,
       account:accounts(account_name, total_projects, last_project_date, lifetime_revenue)`,
    )
    .eq('lead_id', id)
    .order('match_score', { ascending: false });

  if (error) {
    logger.error('Failed to fetch lead account matches', { lead_id: id, error });
    throw dbError(error.message);
  }

  return NextResponse.json(data ?? []);
});

export const PATCH = withApiRoute({ bodySchema: patchSchema }, async ({ params, body }) => {
  const { id } = params;
  const { match_id, is_confirmed } = body as z.infer<typeof patchSchema>;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: existing, error: fetchError } = await supabase
    .from('lead_account_matches')
    .select('id, lead_id')
    .eq('id', match_id)
    .eq('lead_id', id)
    .single();

  if (fetchError || !existing) throw notFound('Match not found');

  const krewpactUserId = await getKrewpactUserId();

  const { data, error } = await supabase
    .from('lead_account_matches')
    .update({
      is_confirmed,
      confirmed_by: krewpactUserId,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', match_id)
    .select(
      `id, lead_id, account_id, match_type, match_score, is_confirmed, confirmed_by, confirmed_at,
       account:accounts(account_name, total_projects, last_project_date, lifetime_revenue)`,
    )
    .single();

  if (error) {
    logger.error('Failed to update lead account match', { match_id, error });
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});
