import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

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
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Check org profile (organizations table)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, address, phone')
      .limit(1)
      .maybeSingle();

    if (orgError) {
      logger.error('Onboarding: failed to fetch org', { error: orgError.message });
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    const hasOrgProfile = !!(org?.name && org?.address);

    // Check divisions
    const { count: divisionCount, error: divError } = await supabase
      .from('divisions')
      .select('id', { count: 'exact', head: true });

    if (divError) {
      logger.error('Onboarding: failed to fetch divisions', { error: divError.message });
      return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
    }

    const hasDivisions = (divisionCount ?? 0) > 0;

    // Check team members (user_profiles beyond the current user)
    const { count: memberCount, error: memberError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .neq('clerk_user_id', userId);

    if (memberError) {
      logger.error('Onboarding: failed to fetch members', { error: memberError.message });
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    const hasTeamMembers = (memberCount ?? 0) > 0;

    // Determine current step
    let currentStep = 1;
    if (hasOrgProfile) currentStep = 2;
    if (hasOrgProfile && hasDivisions) currentStep = 3;
    if (hasOrgProfile && hasDivisions && hasTeamMembers) currentStep = 4;

    const completed = currentStep === 4;

    return NextResponse.json({ completed, currentStep });
  } catch (err: unknown) {
    logger.error('Onboarding status check failed', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
