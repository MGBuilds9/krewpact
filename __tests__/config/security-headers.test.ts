import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: vi.fn((config) => config),
}));

describe('Security headers', () => {
  it('next.config exports headers function', async () => {
    const config = (await import('@/next.config')).default;
    expect(config.headers).toBeDefined();
    expect(typeof config.headers).toBe('function');
  });

  it('returns required security headers', async () => {
    const config = (await import('@/next.config')).default;
    const headers = await config.headers!();
    expect(headers).toHaveLength(1);
    const headerMap = Object.fromEntries(
      headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]),
    );
    expect(headerMap['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headerMap['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headerMap['X-Frame-Options']).toBe('DENY');
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headerMap['Permissions-Policy']).toContain('camera=()');
  });
});
