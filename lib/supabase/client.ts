import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client — uses anon key, relies on Clerk session for auth.
 * Use for client-side data fetching where RLS is handled server-side.
 */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
