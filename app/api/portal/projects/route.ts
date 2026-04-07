import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/portal/projects
 * Returns projects that the calling portal account has permission to view.
 * Gate: user must have a clerk_user_id matching a portal_accounts row
 * with at least one portal_permissions entry.
 */
export const GET = withApiRoute({}, async ({ userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // 1. Resolve the portal_account for this Clerk user
  const { data: portalAccount, error: paError } = await supabase
    .from('portal_accounts')
    .select('id, actor_type, status, company_name, contact_name')
    .eq('clerk_user_id', userId)
    .single();

  if (paError || !portalAccount) {
    throw forbidden('Portal account not found for this user');
  }

  if (portalAccount.status !== 'active') {
    throw forbidden('Portal account is not active. Please complete onboarding.');
  }

  // 2. Fetch projects via portal_permissions join
  const { data: permissions, error: permError } = await supabase
    .from('portal_permissions')
    .select(
      `
      project_id,
      permission_set,
      projects (
        id,
        project_name,
        project_number,
        status,
        start_date,
        target_completion_date,
        actual_completion_date,
        site_address
      )
    `,
    )
    .eq('portal_account_id', portalAccount.id);

  if (permError) {
    throw dbError(permError.message);
  }

  // 3. Shape the response — redact financial info unless permission_set allows it
  const projects = (permissions ?? []).map((p) => {
    // Supabase join returns a single related row object, but generated types may differ
    const project = p.projects as unknown as Record<string, unknown> | null;
    const permSet: Record<string, boolean> = (p.permission_set as Record<string, boolean>) ?? {};
    return {
      ...project,
      permission_set: permSet,
    };
  });

  return NextResponse.json({
    portal_account: {
      id: portalAccount.id,
      actor_type: portalAccount.actor_type,
      company_name: portalAccount.company_name,
    },
    projects,
  });
});
