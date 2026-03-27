import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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
 * Require the authenticated user to have at least one of the given roles.
 * Returns userId + roles on success, or a 403 NextResponse on failure.
 */
export async function requireRole(
  allowedRoles: string[],
): Promise<{ userId: string; roles: string[] } | NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => allowedRoles.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId, roles };
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
 * Extract org_id (UUID) from Clerk session claims for API routes.
 * Falls back to the default org UUID if no claim is present (single-org mode).
 * This must be a UUID matching organizations.id, not a slug.
 */
export async function getOrgIdFromAuth(): Promise<string> {
  const meta = await _getClerkMetadata();
  const orgId = meta?.krewpact_org_id as string | undefined;

  if (orgId) return orgId;

  // Single-org fallback: MDM Group org UUID from seed
  // This is the organizations.id for slug='default' seeded in 20260302_001
  return process.env.DEFAULT_ORG_ID || 'e076c9b9-72ce-4fdc-a031-e5808e73d92c';
}
