import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  UNAUTHORIZED,
  INVALID_JSON,
  validationError,
  dbError,
  notFound,
  errorResponse,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { getKrewpactUserId } from '@/lib/api/org';

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  match_id: z.string().uuid(),
  is_confirmed: z.boolean(),
});

/**
 * GET /api/crm/leads/[id]/matches
 * Returns all account matches for a lead, joined with account data.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
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
    return errorResponse(dbError(error.message));
  }

  return NextResponse.json(data ?? []);
}

/**
 * PATCH /api/crm/leads/[id]/matches
 * Confirm or dismiss a lead-account match.
 * Body: { match_id: string, is_confirmed: boolean }
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { match_id, is_confirmed } = parsed.data;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Verify the match belongs to this lead
  const { data: existing, error: fetchError } = await supabase
    .from('lead_account_matches')
    .select('id, lead_id')
    .eq('id', match_id)
    .eq('lead_id', id)
    .single();

  if (fetchError || !existing) {
    return errorResponse(notFound('Match not found'));
  }

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
    return errorResponse(dbError(error.message));
  }

  return NextResponse.json(data);
}
