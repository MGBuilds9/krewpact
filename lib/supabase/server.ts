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
