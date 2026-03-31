import { clerkClient } from '@clerk/nextjs/server';

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// eslint-disable-next-line max-lines-per-function, complexity
export async function syncRolesToBothStores(params: {
  supabaseUserId: string;
  clerkUserId: string;
  roleKeys: string[];
  divisionIds?: string[];
  assignedBy?: string;
}): Promise<{ success: boolean; errors: string[] }> {
  const { supabaseUserId, clerkUserId, roleKeys, divisionIds, assignedBy } = params;
  const errors: string[] = [];
  const db = createServiceClient();

  // 1. Look up role IDs from roles table
  const { data: roles, error: rolesError } = await db
    .from('roles')
    .select('id, role_key')
    .in('role_key', roleKeys);

  if (rolesError || !roles) {
    errors.push(`Failed to fetch roles: ${rolesError?.message ?? 'no data'}`);
    logger.error('syncRolesToBothStores: role lookup failed', {
      supabaseUserId,
      error: rolesError?.message,
    });
    return { success: false, errors };
  }

  // 2. Sync user_roles — delete all existing, then insert new set
  try {
    // Delete all existing roles for this user, then reinsert the desired set.
    // This avoids conflict with the composite unique index that includes division_id.
    const { error: deleteError } = await db
      .from('user_roles')
      .delete()
      .eq('user_id', supabaseUserId);

    if (deleteError) throw deleteError;

    if (roles.length > 0) {
      const insertRows = roles.map((role, idx) => ({
        user_id: supabaseUserId,
        role_id: role.id,
        is_primary: idx === 0,
        assigned_by: assignedBy ?? null,
      }));

      const { error: insertError } = await db.from('user_roles').insert(insertRows);
      if (insertError) throw insertError;
    }

    logger.info('syncRolesToBothStores: user_roles synced', { supabaseUserId, roleKeys });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Supabase user_roles sync failed: ${msg}`);
    logger.error('syncRolesToBothStores: user_roles sync failed', { supabaseUserId, error: msg });
  }

  // 3. Sync user_divisions if provided
  if (divisionIds !== undefined) {
    try {
      await db.from('user_divisions').delete().eq('user_id', supabaseUserId);

      if (divisionIds.length > 0) {
        const divisionRows = divisionIds.map((divisionId) => ({
          user_id: supabaseUserId,
          division_id: divisionId,
        }));

        const { error: divError } = await db.from('user_divisions').insert(divisionRows);
        if (divError) throw divError;
      }

      logger.info('syncRolesToBothStores: user_divisions synced', {
        supabaseUserId,
        divisionCount: divisionIds.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Supabase user_divisions sync failed: ${msg}`);
      logger.error('syncRolesToBothStores: user_divisions sync failed', {
        supabaseUserId,
        error: msg,
      });
    }
  }

  // 4. Resolve user's org from Supabase (not env var — multi-tenant safe)
  let orgId: string | undefined;
  let orgSlug: string | undefined;
  try {
    const { data: userData, error: userError } = await db
      .from('users')
      .select('org_id, organizations(slug)')
      .eq('id', supabaseUserId)
      .single();

    if (userError || !userData?.org_id) {
      throw new Error(
        userError?.message ?? `User ${supabaseUserId} has no org_id`,
      );
    }
    orgId = userData.org_id;
    const org = Array.isArray(userData.organizations)
      ? userData.organizations[0]
      : userData.organizations;
    orgSlug = (org as { slug?: string } | null)?.slug;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`User org lookup failed: ${msg}`);
    logger.error('syncRolesToBothStores: org lookup failed', { supabaseUserId, error: msg });
  }

  // 5. Update Clerk publicMetadata
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        role_keys: roleKeys,
        division_ids: divisionIds ?? [],
        krewpact_user_id: supabaseUserId,
        krewpact_org_id: orgId,
        krewpact_org_slug: orgSlug,
      },
    });

    logger.info('syncRolesToBothStores: Clerk metadata updated', { clerkUserId, roleKeys, orgId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Clerk metadata update failed: ${msg}`);
    logger.error('syncRolesToBothStores: Clerk update failed', { clerkUserId, error: msg });
  }

  return { success: errors.length === 0, errors };
}
