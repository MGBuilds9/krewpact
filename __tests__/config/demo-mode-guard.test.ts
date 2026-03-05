import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

describe('Demo mode production guard', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('exports DEMO_MODE as false by default', async () => {
    const { DEMO_MODE } = await import('@/lib/demo-mode');
    expect(DEMO_MODE).toBe(false);
  });

  it('exports DEMO_MODE as true when env is set', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const { DEMO_MODE } = await import('@/lib/demo-mode');
    expect(DEMO_MODE).toBe(true);
  });
});
