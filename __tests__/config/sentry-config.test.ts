import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInit = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  init: (...args: unknown[]) => mockInit(...args),
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

  it('inits Sentry server when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/456';
    await import('@/sentry.server.config');
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.io/456',
      }),
    );
  });
});
