import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';


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

export async function getKrewpactOrgId(): Promise<string | null> {
  const meta = await _getClerkMetadata();
  return (meta?.krewpact_org_id as string | null) ?? null;
}

export async function getKrewpactOrgSlug(): Promise<string | null> {
  const meta = await _getClerkMetadata();
  return (meta?.krewpact_org_slug as string | null) ?? null;
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
