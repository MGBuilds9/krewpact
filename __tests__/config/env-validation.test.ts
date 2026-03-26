import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Required env vars that must always be present for validation to pass
const REQUIRED_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_key',
};

describe('Environment validation', () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure required vars are always present
    Object.assign(process.env, REQUIRED_VARS);
  });

  it('exports env object when required vars are present', async () => {
    const { env } = await import('@/lib/env');
    expect(env).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
  });

  it('accepts optional Sentry env vars', async () => {
    process.env.SENTRY_ORG = 'test-org';
    process.env.SENTRY_PROJECT = 'test-project';
    process.env.SENTRY_AUTH_TOKEN = 'sntrys_token123';
    const { env } = await import('@/lib/env');
    expect(env.SENTRY_ORG).toBe('test-org');
    expect(env.SENTRY_PROJECT).toBe('test-project');
    expect(env.SENTRY_AUTH_TOKEN).toBe('sntrys_token123');
  });

  it('warns when Sentry DSN is set but org/project are missing', async () => {
    const { logger } = await import('@/lib/logger');
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
    // Required in production by superRefine
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.CLERK_SECRET_KEY = 'sk_test_key';
    process.env.CRON_SECRET = 'test-cron-secret';
    const origNodeEnv = process.env.NODE_ENV;
    // @ts-expect-error -- NODE_ENV is readonly
    process.env.NODE_ENV = 'production';
    await import('@/lib/env');
    expect(logger.warn).toHaveBeenCalledWith(
      '[env] Production warnings',
      expect.objectContaining({
        warnings: expect.arrayContaining([expect.stringContaining('SENTRY_ORG/SENTRY_PROJECT')]),
      }),
    );
    // @ts-expect-error -- restore
    process.env.NODE_ENV = origNodeEnv;
  });

  it('warns when QStash signing keys are missing in production', async () => {
    const { logger } = await import('@/lib/logger');
    process.env.QSTASH_TOKEN = 'qstash-token';
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;
    // Required in production by superRefine
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.CLERK_SECRET_KEY = 'sk_test_key';
    process.env.CRON_SECRET = 'test-cron-secret';
    const origNodeEnv = process.env.NODE_ENV;
    // @ts-expect-error test env override
    process.env.NODE_ENV = 'production';

    await import('@/lib/env');

    expect(logger.warn).toHaveBeenCalledWith(
      '[env] Production warnings',
      expect.objectContaining({
        warnings: expect.arrayContaining([expect.stringContaining('QSTASH signing keys')]),
      }),
    );

    // @ts-expect-error test env override
    process.env.NODE_ENV = origNodeEnv;
  });
});
