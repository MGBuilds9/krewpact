import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

describe('Supabase browser client', () => {
  it('exports createBrowserClient function', async () => {
    const mod = await import('@/lib/supabase/client');
    expect(mod.createBrowserClient).toBeDefined();
    expect(typeof mod.createBrowserClient).toBe('function');
  });

  it('returns a Supabase client instance', async () => {
    const { createBrowserClient } = await import('@/lib/supabase/client');
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
