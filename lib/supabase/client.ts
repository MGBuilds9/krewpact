import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type { Database };

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
