import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { DEMO_MODE } from '@/lib/demo-mode';
import type { Database } from '@/types/supabase';

export type { Database };

/** The client type returned by createUserClient — matches its inferred return type. */
type UserClient = Awaited<ReturnType<typeof createUserClient>>;

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

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
  // Use Clerk session token (Third-Party Auth) — not the deprecated JWT template
  const token = await getToken();

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

/**
 * Safe wrapper around createUserClient that returns {client, error} instead of throwing.
 * Routes use this to return 401 instead of crashing with 500 when JWT template fails.
 */
export async function createUserClientSafe(): Promise<
  { client: UserClient; error: null } | { client: null; error: NextResponse }
> {
  try {
    const client = await createUserClient();
    return { client, error: null };
  } catch {
    return {
      client: null,
      error: NextResponse.json(
        { error: 'Authentication failed — please sign in again' },
        { status: 401 },
      ),
    };
  }
}
