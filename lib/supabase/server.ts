import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { DEMO_MODE } from '@/lib/demo-mode';
import type { Database } from '@/types/supabase';

export type { Database };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Service client with audit context. Use this for new code.
 * Logs the calling context for security audit trail.
 */
export function createScopedServiceClient(context: string) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[service-client] ${context}`);
  }
  return createServiceClient();
}

export async function createUserClient() {
  // In demo mode, use anon client without auth headers (anon RLS policies enabled)
  if (DEMO_MODE) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  const { getToken } = await auth();
  const token = await getToken({ template: 'comet' });

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
