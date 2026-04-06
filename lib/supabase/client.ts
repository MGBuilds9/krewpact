import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type { Database };

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (!_client) {
    _client = createClient<Database>(
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
    );
  }
  return _client;
}

/** @internal Test-only: reset cached client between test suites */
export function __resetBrowserClient() {
  _client = null;
}
