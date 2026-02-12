import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Service client — bypasses RLS, for server-only operations (webhooks, cron, admin).
 * NEVER expose to the client.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * User client — uses Clerk JWT to authenticate as the current user.
 * Respects RLS policies. Use for all user-scoped data access.
 *
 * Requires Clerk JWT template "supabase" configured with claims:
 *   sub, role: "authenticated", krewpact_user_id, krewpact_divisions, krewpact_roles
 */
export async function createUserClient(): Promise<SupabaseClient> {
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' });

  if (!token) {
    throw new Error('No Clerk session — user must be authenticated');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
