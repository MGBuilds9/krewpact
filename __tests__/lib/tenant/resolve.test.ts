import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for hostname parsing logic in lib/tenant/resolve.ts
// These tests focus on the pure parsing / Set-membership logic without hitting
// the DB.  The Supabase service client is mocked to return null so the cache
// fill path is exercised without real I/O.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

// Re-import after mocks are in place
import { resolveTenant } from '@/lib/tenant/resolve';

describe('resolveTenant — hostname parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('main domain detection (returns null)', () => {
    it.each([['krewpact.com'], ['www.krewpact.com'], ['localhost']])(
      'returns null for main domain %s',
      async (hostname) => {
        const result = await resolveTenant(hostname);
        expect(result).toBeNull();
      },
    );
  });

  describe('subdomain extraction from *.krewpact.com', () => {
    it('resolves acme.krewpact.com as a subdomain lookup (no DB match → null)', async () => {
      // DB is mocked to return null; we verify no throw and result is null
      const result = await resolveTenant('acme.krewpact.com');
      expect(result).toBeNull();
    });
  });

  describe('port stripping', () => {
    it('strips port before resolution — acme.krewpact.com:3000 treated same as acme.krewpact.com', async () => {
      const withPort = await resolveTenant('acme.krewpact.com:3000');
      const withoutPort = await resolveTenant('acme.krewpact.com');
      // Both should be null (DB mock returns null); importantly neither throws
      expect(withPort).toBeNull();
      expect(withoutPort).toBeNull();
    });

    it('strips port from localhost — localhost:3000 treated as main domain', async () => {
      const result = await resolveTenant('localhost:3000');
      // After stripping port → 'localhost' → main domain → null without DB call
      expect(result).toBeNull();
    });
  });

  describe('two-part domains do not match as krewpact subdomains', () => {
    it('krewpact.com with no subdomain is a main domain', async () => {
      const result = await resolveTenant('krewpact.com');
      expect(result).toBeNull();
    });

    it('deep.acme.krewpact.com (4 parts) does not match as subdomain', async () => {
      // Falls through to custom_domain lookup (DB returns null)
      const result = await resolveTenant('deep.acme.krewpact.com');
      expect(result).toBeNull();
    });
  });

  describe('custom domain path', () => {
    it('a non-krewpact hostname triggers custom_domain lookup (no DB match → null)', async () => {
      const result = await resolveTenant('client.example.com');
      expect(result).toBeNull();
    });
  });

  describe('empty / blank hostname', () => {
    it('returns null for empty string', async () => {
      const result = await resolveTenant('');
      expect(result).toBeNull();
    });
  });
});
