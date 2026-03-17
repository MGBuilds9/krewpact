import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/onboarding/status
 *
 * Returns the onboarding completion status for the authenticated user's org.
 * Checks whether the org has at least one division configured and at least
 * one team member (user_profile row beyond the current user).
 *
 * Response: { completed: boolean, currentStep: number }
 *   Step 1 = company profile, Step 2 = divisions, Step 3 = team invites, Step 4 = done
 */

type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

async function fetchOnboardingData(supabase: SupabaseClient, userId: string) {
  const [orgResult, divResult, memberResult] = await Promise.all([
    supabase.from('organizations').select('id, name, address, phone').limit(1).maybeSingle(),
    supabase.from('divisions').select('id', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('clerk_user_id', userId),
  ]);
  return { orgResult, divResult, memberResult };
}

function computeOnboardingStep(
  hasOrgProfile: boolean,
  hasDivisions: boolean,
  hasTeamMembers: boolean,
): number {
  if (hasOrgProfile && hasDivisions && hasTeamMembers) return 4;
  if (hasOrgProfile && hasDivisions) return 3;
  if (hasOrgProfile) return 2;
  return 1;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { orgResult, divResult, memberResult } = await fetchOnboardingData(supabase, userId);

    if (orgResult.error) {
      logger.error('Onboarding: failed to fetch org', { error: orgResult.error.message });
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }
    if (divResult.error) {
      logger.error('Onboarding: failed to fetch divisions', { error: divResult.error.message });
      return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
    }
    if (memberResult.error) {
      logger.error('Onboarding: failed to fetch members', { error: memberResult.error.message });
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    const hasOrgProfile = !!(orgResult.data?.name && orgResult.data?.address);
    const hasDivisions = (divResult.count ?? 0) > 0;
    const hasTeamMembers = (memberResult.count ?? 0) > 0;
    const currentStep = computeOnboardingStep(hasOrgProfile, hasDivisions, hasTeamMembers);

    return NextResponse.json({ completed: currentStep === 4, currentStep });
  } catch (err: unknown) {
    logger.error('Onboarding status check failed', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
