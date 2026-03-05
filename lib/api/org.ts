import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ApiError } from './errors';

/**
 * Extract org context from request headers (set by middleware for page routes).
 */
export function getOrgFromHeaders(req: NextRequest): { orgId: string; orgSlug: string } {
  const orgId = req.headers.get('x-krewpact-org-id');
  const orgSlug = req.headers.get('x-krewpact-org-slug');
  if (!orgId || !orgSlug) {
    throw new ApiError('ORG_REQUIRED', 'Organization context required', 400);
  }
  return { orgId, orgSlug };
}

/**
 * Extract org_id from Clerk session claims for API routes.
 * Falls back to the default org if no claim is present (demo mode compat).
 */
export async function getOrgIdFromAuth(): Promise<string> {
  const { sessionClaims } = await auth();
  const claims = sessionClaims as Record<string, unknown> | null;
  const orgId = claims?.krewpact_org_id as string | undefined;

  if (orgId) return orgId;

  // Single-org: MDM Group is the only org
  return 'mdm-group';
}
