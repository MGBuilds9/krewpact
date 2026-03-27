import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInit = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  replayIntegration: vi.fn(() => 'replay-integration'),
  browserTracingIntegration: vi.fn(() => 'browser-tracing-integration'),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('Sentry configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInit.mockClear();
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
  });

  it('does not init Sentry when DSN is missing', async () => {
    await import('@/sentry.client.config');
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('inits Sentry client when NEXT_PUBLIC_SENTRY_DSN is set', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    await import('@/sentry.client.config');
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.io/123',
      }),
    );
  });

  it('inits Sentry server via instrumentation when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/456';
    const { register } = await import('@/instrumentation');
    await register();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.io/456',
      }),
    );
  });
});
