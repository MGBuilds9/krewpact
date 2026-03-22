import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

import { ApiError } from './errors';

async function _getClerkMetadata(): Promise<Record<string, unknown>> {
  const { sessionClaims } = await auth();
  const claims = sessionClaims as Record<string, unknown> | null;
  return (claims?.metadata as Record<string, unknown>) ?? {};
}

export async function getKrewpactUserId(): Promise<string | null> {
  const meta = await _getClerkMetadata();
  return (meta?.krewpact_user_id as string | null) ?? null;
}

export async function getKrewpactRoles(): Promise<string[]> {
  const meta = await _getClerkMetadata();
  const roles = meta?.role_keys;
  return Array.isArray(roles) ? roles : [];
}

export async function getKrewpactDivisions(): Promise<string[]> {
  const meta = await _getClerkMetadata();
  const divisions = meta?.division_ids;
  return Array.isArray(divisions) ? divisions : [];
}

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
 * Falls back to the default org if no claim is present (single-org mode).
 */
export async function getOrgIdFromAuth(): Promise<string> {
  const meta = await _getClerkMetadata();
  const orgId = meta?.krewpact_org_id as string | undefined;

  if (orgId) return orgId;

  // Single-org: MDM Group is the only org
  return 'mdm-group';
}
